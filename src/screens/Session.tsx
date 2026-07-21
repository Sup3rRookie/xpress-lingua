import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Deck, DeckItem } from '../data/types';
import { speak } from '../lib/audio';
import { playAudioKey } from '../lib/mediaStore';
import { playUrl, recordingSupported, startRecording, stopRecording } from '../lib/recorder';
import { buildQueue, deckStats, review, Rating, type Grade } from '../lib/srs';
import { syllables, toneOf, TONE_COLORS } from '../lib/pinyin';
import { exampleFor } from '../lib/sentences';
import { fonts, hanziSize, shadows, springs, tokens } from '../theme';
import { useReducedMotion } from '../lib/motion';
import TonePinyin from '../components/TonePinyin';
import ChunkyButton from '../components/ChunkyButton';
import Confetti from '../components/Confetti';
import GlowEllipse from '../components/GlowEllipse';

type Phase = 'front' | 'back';

const CARD_H = 540;
const XP_PER_CARD = 10;

const GRADES: {
  label: string;
  icon: string;
  rating: Grade;
  face: string;
  edge: string;
  text: string;
}[] = [
  {
    label: 'Blank',
    icon: '↺',
    rating: Rating.Again,
    face: tokens.semantic.danger,
    edge: tokens.semantic.dangerDown,
    text: tokens.text.onCard,
  },
  {
    label: 'Shaky',
    icon: '⚠',
    rating: Rating.Hard,
    face: tokens.semantic.warn,
    edge: tokens.semantic.warnDown,
    text: tokens.text.onCard,
  },
  {
    label: 'Nailed it',
    icon: '✓',
    rating: Rating.Good,
    face: tokens.semantic.success,
    edge: tokens.semantic.successDown,
    text: tokens.text.onCard,
  },
  {
    // Face darkened from brand.primary so the white label clears contrast.
    label: 'Too easy',
    icon: '✓✓',
    rating: Rating.Easy,
    face: '#7C3AED',
    edge: '#5F30CE',
    text: '#FFFFFF',
  },
];

function toneTint(pinyin: string, alpha: number): string {
  const hex = TONE_COLORS[toneOf(syllables(pinyin)[0] ?? '')] ?? tokens.brand.primary;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Animated count-up backed by an Animated.Value listener.
function useCountUp(target: number, delay: number, reduced: boolean): number {
  const [val, setVal] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      setVal(target);
      return;
    }
    const av = new Animated.Value(0);
    const id = av.addListener(({ value }) => setVal(Math.round(value)));
    Animated.timing(av, {
      toValue: target,
      duration: 900,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => av.removeListener(id);
  }, [target, delay, reduced]);
  return val;
}

// Segmented in-session progress: one segment per card.
function SegmentedProgress({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.segmentRow} accessibilityLabel={`Card ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        if (i < current) {
          return (
            <View key={i} style={styles.segment}>
              <LinearGradient
                colors={tokens.brand.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
          );
        }
        return (
          <View
            key={i}
            style={[
              styles.segment,
              {
                backgroundColor:
                  i === current ? tokens.brand.primary : tokens.game.ringTrack,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function SessionComplete({
  reviewed,
  deck,
  onDone,
}: {
  reviewed: number;
  deck: Deck;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const [streak, setStreak] = useState<number | null>(null);
  const cardAnim = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const ctaAnim = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    deckStats(deck).then((s) => setStreak(s.streak));
  }, [deck]);

  useEffect(() => {
    if (reduced) return;
    Animated.spring(cardAnim, {
      toValue: 1,
      delay: 300,
      ...springs.bouncy,
      useNativeDriver: false,
    }).start();
    Animated.timing(ctaAnim, {
      toValue: 1,
      duration: 400,
      delay: 1100,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [reduced, cardAnim, ctaAnim]);

  const xp = useCountUp(reviewed * XP_PER_CARD, 600, reduced);
  const spoken = useCountUp(reviewed, 600, reduced);
  const cardScale = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <View style={styles.center}>
      <GlowEllipse style={styles.doneGlow} />
      <Confetti />
      <Text style={styles.doneEmoji}>🎉</Text>
      <Text style={styles.doneTitle}>Session complete</Text>

      <Animated.View
        style={[styles.doneCard, { opacity: cardAnim, transform: [{ scale: cardScale }] }]}
      >
        <Text style={styles.doneXp}>+{xp} XP</Text>
        <View style={styles.doneStatRow}>
          <View style={styles.doneStat}>
            <Text style={styles.doneStatNum}>{spoken}</Text>
            <Text style={styles.doneStatLabel}>
              card{reviewed === 1 ? '' : 's'} spoken{'\n'}out loud
            </Text>
          </View>
          <View style={styles.doneStatDivider} />
          <View style={styles.doneStat}>
            <Text style={styles.doneStatNum}>🔥 {streak ?? '–'}</Text>
            <Text style={styles.doneStatLabel}>day streak{'\n'}see you tomorrow!</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: ctaAnim, width: '100%', maxWidth: 320 }}>
        <ChunkyButton
          label="Back to home"
          gradient={tokens.brand.gradient}
          edge={tokens.brand.primaryDown}
          textColor={tokens.text.onCard}
          onPress={onDone}
        />
      </Animated.View>
    </View>
  );
}

export default function Session({ deck, onDone }: { deck: Deck; onDone: () => void }) {
  const reduced = useReducedMotion();
  const [queue, setQueue] = useState<DeckItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('front');
  const [flipDone, setFlipDone] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [recording, setRecording] = useState(false);
  const [myTakeUrl, setMyTakeUrl] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const [fx, setFx] = useState<{ color: string } | null>(null);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const fxAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    buildQueue(deck).then((q) => {
      setNewIds(new Set(q.fresh.map((i) => i.id)));
      setQueue([...q.due, ...q.fresh]);
    });
  }, [deck]);

  const item = useMemo(() => (queue && index < queue.length ? queue[index] : null), [queue, index]);
  const isNew = item ? newIds.has(item.id) : false;
  const isZh = deck.lang === 'zh';

  // Imported audio wins over TTS; TTS remains the fallback when playback fails.
  const playItemAudio = (it: DeckItem) => {
    if (it.audioKey) {
      playAudioKey(it.audioKey).then((ok) => {
        if (!ok) speak(it.hanzi, deck.ttsLocale);
      });
    } else {
      speak(it.hanzi, deck.ttsLocale);
    }
  };

  if (!queue) {
    return (
      <View style={styles.center}>
        <Text style={styles.mutedText}>Loading session…</Text>
      </View>
    );
  }

  if (!item) {
    return <SessionComplete reviewed={reviewed} deck={deck} onDone={onDone} />;
  }

  const flip = () => {
    setPhase('back');
    playItemAudio(item);
    if (reduced) {
      flipAnim.setValue(1);
      setFlipDone(true);
      return;
    }
    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setFlipDone(true);
    });
  };

  const advance = async (rating: Grade) => {
    await review(item.id, rating);
    setReviewed((n) => n + 1);
    setMyTakeUrl(null);
    setFx(null);
    fxAnim.setValue(0);
    flipAnim.setValue(0);
    setFlipDone(false);
    setPhase('front');
    setIndex((i) => i + 1);
  };

  const grade = (g: (typeof GRADES)[number]) => {
    if (fx) return;
    if (reduced) {
      advance(g.rating);
      return;
    }
    setFx({ color: g.face });
    Animated.timing(fxAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => advance(g.rating));
  };

  const toggleRecord = async () => {
    if (recording) {
      const url = await stopRecording();
      setRecording(false);
      setMyTakeUrl(url);
      if (url) playUrl(url);
    } else {
      const ok = await startRecording();
      setRecording(ok);
    }
  };

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const fxScale = fxAnim.interpolate({
    inputRange: [0, 0.3, 0.5, 1],
    outputRange: [0, 1.15, 1, 1],
  });
  const fxTranslate = fxAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });
  const fxOpacity = fxAnim.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.topBar}>
          <Pressable onPress={onDone} style={styles.endBtn} accessibilityRole="button">
            <Text style={styles.endBtnText}>✕ End</Text>
          </Pressable>
          <Text style={styles.counter}>
            {index + 1} / {queue.length}
          </Text>
        </View>
        <SegmentedProgress total={queue.length} current={index} />

        {/* Flashcard with glow underlay */}
        <View style={styles.cardZone}>
          <GlowEllipse width={440} height={CARD_H} style={styles.cardGlow} />

          {/* FRONT */}
          <Animated.View
            pointerEvents={phase === 'front' ? 'auto' : 'none'}
            style={[styles.face, { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] }]}
          >
            <View style={styles.faceEdge}>
              <View style={styles.faceSurface}>
                {isNew && (
                  <LinearGradient
                    colors={tokens.brand.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.newBadge}
                  >
                    <Text style={styles.newBadgeText}>✨ NEW — listen first, then copy it</Text>
                  </LinearGradient>
                )}
                <View
                  style={[
                    styles.emojiCircle,
                    {
                      backgroundColor: isZh
                        ? toneTint(item.pinyin, 0.1)
                        : 'rgba(139,92,246,0.10)',
                    },
                  ]}
                >
                  <Text style={styles.emoji}>{item.emoji ?? '🃏'}</Text>
                </View>
                <Text style={styles.gloss}>{item.gloss}</Text>
                <Text style={styles.speakPrompt}>🗣️ Say it out loud</Text>
                {isNew && (
                  <Pressable
                    style={styles.pillChip}
                    onPress={() => playItemAudio(item)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.pillChipText}>🔊 Hear it first (new card)</Text>
                  </Pressable>
                )}
                <View style={styles.flipBtnWrap}>
                  <ChunkyButton
                    label="I said it — flip"
                    face={tokens.brand.primary}
                    edge={tokens.brand.primaryDown}
                    onPress={flip}
                    accessibilityHint="Flips the card to show the answer"
                  />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* BACK */}
          <Animated.View
            pointerEvents={phase === 'back' ? 'auto' : 'none'}
            style={[styles.face, { transform: [{ perspective: 1000 }, { rotateY: backRotate }] }]}
          >
            <View style={styles.faceEdge}>
              <View style={styles.faceSurface}>
                {isZh && item.pinyin ? (
                  <TonePinyin pinyin={item.pinyin} size={26} />
                ) : item.pinyin ? (
                  <Text style={styles.notation}>{item.pinyin}</Text>
                ) : null}
                <Text
                  style={[
                    styles.hanzi,
                    { fontSize: hanziSize(item.hanzi) },
                    !isZh && styles.phrasePlain,
                  ]}
                >
                  {item.hanzi}
                </Text>

                {isZh && exampleFor(item.id) && (
                  <View style={styles.exampleBox}>
                    <Text style={styles.exampleLabel}>IN A SENTENCE</Text>
                    <Pressable
                      onPress={() => speak(exampleFor(item.id)!.hanzi, deck.ttsLocale)}
                      accessibilityRole="button"
                      accessibilityLabel="Play example sentence"
                    >
                      <Text style={styles.exampleHanzi}>
                        {exampleFor(item.id)!.hanzi} <Text style={styles.examplePlay}>▶</Text>
                      </Text>
                    </Pressable>
                    <TonePinyin pinyin={exampleFor(item.id)!.pinyin} size={13} />
                    <Text style={styles.exampleGloss}>{exampleFor(item.id)!.gloss}</Text>
                  </View>
                )}

                <View style={styles.chipRow}>
                  <Pressable
                    style={styles.pillChip}
                    onPress={() => playItemAudio(item)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.pillChipText}>🔊 Native</Text>
                  </Pressable>
                  {/* Slow is TTS-only, so it hides when the card has imported audio. */}
                  {!item.audioKey && (
                    <Pressable
                      style={styles.pillChip}
                      onPress={() => speak(item.hanzi, deck.ttsLocale, true)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.pillChipText}>🐢 Slow</Text>
                    </Pressable>
                  )}
                </View>

                {recordingSupported() && (
                  <View style={styles.chipRow}>
                    <Pressable
                      style={[styles.pillChip, recording && styles.pillChipRec]}
                      onPress={toggleRecord}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.pillChipText, recording && styles.pillChipRecText]}>
                        {recording ? '⏹ Stop' : '🎙️ Record my take'}
                      </Text>
                    </Pressable>
                    {myTakeUrl && (
                      <Pressable
                        style={styles.pillChip}
                        onPress={() => playUrl(myTakeUrl)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.pillChipText}>▶️ My take</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                <Text style={styles.gradeHint}>How did your spoken answer go?</Text>
                <View style={styles.gradeRow}>
                  {GRADES.map((g) => (
                    <ChunkyButton
                      key={g.label}
                      label={g.label}
                      icon={g.icon}
                      face={g.face}
                      edge={g.edge}
                      textColor={g.text}
                      small
                      disabled={!flipDone || !!fx}
                      onPress={() => grade(g)}
                      style={styles.gradeBtn}
                    />
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Grade micro-feedback chip */}
          {fx && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.fxChip,
                {
                  opacity: fxOpacity,
                  transform: [{ translateY: fxTranslate }, { scale: fxScale }],
                },
              ]}
            >
              <Text style={[styles.fxCheck, { color: fx.color }]}>✓</Text>
              <Text style={styles.fxText}>+{XP_PER_CARD} XP</Text>
            </Animated.View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.bg.base },
  content: { padding: 20, paddingBottom: 40 },
  inner: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  center: {
    flex: 1,
    backgroundColor: tokens.bg.base,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  endBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  endBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: tokens.text.secondary },
  counter: { fontFamily: fonts.stat, fontSize: 14, color: tokens.text.secondary },
  segmentRow: { flexDirection: 'row', gap: 3, marginBottom: 20 },
  segment: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  cardZone: { height: CARD_H, justifyContent: 'center' },
  cardGlow: { alignSelf: 'center', top: 30 },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
  },
  exampleBox: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(139,92,246,0.07)',
  },
  exampleLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#8A84B0',
  },
  exampleHanzi: {
    fontFamily: fonts.hanzi,
    fontSize: 17,
    color: tokens.text.onCard,
    textAlign: 'center',
  },
  examplePlay: { color: tokens.brand.primary, fontSize: 13 },
  exampleGloss: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: '#6E6893',
    textAlign: 'center',
  },
  faceEdge: {
    flex: 1,
    backgroundColor: tokens.card.faceEdge,
    borderRadius: tokens.radius.card,
    ...shadows.card,
  },
  faceSurface: {
    flex: 1,
    backgroundColor: tokens.card.face,
    borderRadius: tokens.radius.card,
    marginBottom: 4,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  newBadge: {
    borderRadius: tokens.radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  newBadgeText: { fontFamily: fonts.bodyBold, fontSize: 13, color: tokens.text.onCard },
  emojiCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 38 },
  gloss: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 24,
    color: tokens.text.onCard,
    textAlign: 'center',
  },
  speakPrompt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: tokens.text.onCardMuted,
    textAlign: 'center',
  },
  flipBtnWrap: { marginTop: 8, alignSelf: 'stretch' },
  hanzi: {
    fontFamily: fonts.hanzi,
    color: tokens.text.onCard,
    textAlign: 'center',
  },
  // Non-zh target phrase — drop the Hanzi face, keep the plain card ink.
  phrasePlain: {
    fontFamily: fonts.bodyBold,
  },
  // Pronunciation line for non-zh decks (no tone coloring).
  notation: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 24,
    color: tokens.text.onCard,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pillChip: {
    borderWidth: 1.5,
    borderColor: tokens.card.faceEdge,
    borderRadius: tokens.radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  pillChipText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: tokens.text.onCard },
  pillChipRec: {
    borderColor: tokens.semantic.dangerDown,
    backgroundColor: tokens.semantic.dangerBg,
  },
  pillChipRecText: { color: '#B91C3C' },
  gradeHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: tokens.text.onCardMuted,
    marginTop: 4,
  },
  gradeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  gradeBtn: { flexGrow: 1, flexBasis: 100 },
  fxChip: {
    position: 'absolute',
    top: CARD_H / 2 - 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tokens.bg.elevated,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    borderRadius: tokens.radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 18,
    ...shadows.tile,
  },
  fxCheck: { fontFamily: fonts.bodyBold, fontSize: 18 },
  fxText: { fontFamily: fonts.stat, fontSize: 18, color: tokens.game.xpGold },
  mutedText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: tokens.text.secondary },
  doneGlow: { top: -160, alignSelf: 'center' },
  doneEmoji: { fontSize: 64 },
  doneTitle: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: tokens.text.primary,
  },
  doneCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    borderRadius: tokens.radius.tile,
    padding: 22,
    alignItems: 'center',
    gap: 14,
    ...shadows.tile,
  },
  doneXp: {
    fontFamily: fonts.stat,
    fontSize: 40,
    color: tokens.game.xpGold,
  },
  doneStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  doneStat: { flex: 1, alignItems: 'center', gap: 4 },
  doneStatDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: tokens.border.strong,
  },
  doneStatNum: { fontFamily: fonts.stat, fontSize: 24, color: tokens.text.primary },
  doneStatLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 17,
    color: tokens.text.secondary,
    textAlign: 'center',
  },
});
