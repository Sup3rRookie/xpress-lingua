import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Deck } from '../data/types';
import { zhHsk } from '../data/zh-hsk';
import { initBuiltinAudio, initVoice } from '../lib/audio';
import { deckStats, DeckStats } from '../lib/srs';
import { fonts, shadows, tokens } from '../theme';
import ChunkyButton from '../components/ChunkyButton';
import GradientBar from '../components/GradientBar';
import GlowEllipse from '../components/GlowEllipse';

// Accent tints cycled across scenario emoji chips.
const SCENARIO_TINTS = [
  'rgba(139,92,246,0.16)',
  'rgba(34,211,238,0.14)',
  'rgba(255,201,74,0.14)',
  'rgba(52,211,153,0.14)',
  'rgba(251,113,133,0.14)',
];

const CARD_W = 132;
const CARD_GAP = 8;

// Learn tab — slim: header + streak, hero Continue, quick actions, conversations.
export default function Home({
  deck,
  onStart,
  onStudyDeck,
  onSentences,
  onToneTrainer,
}: {
  deck: Deck;
  onStart: () => void;
  onStudyDeck: (d: Deck) => void;
  onSentences: () => void;
  onToneTrainer: () => void;
}) {
  const [stats, setStats] = useState<DeckStats | null>(null);
  const [voiceOk, setVoiceOk] = useState(true);
  const [builtinClips, setBuiltinClips] = useState(0);
  const scenarioScroll = useRef<ScrollView>(null);

  const refresh = useCallback(() => {
    deckStats(deck).then(setStats);
    initVoice(deck.ttsLocale).then(setVoiceOk);
    initBuiltinAudio(deck.lang).then(setBuiltinClips);
  }, [deck]);

  useEffect(refresh, [refresh]);

  // Scroll the first unlocked-incomplete scenario to the left edge.
  useEffect(() => {
    if (!stats) return;
    const idx = deck.scenarios.findIndex((sc, i) => {
      const p = stats.perScenario[sc.id];
      const locked = p ? !p.unlocked : i > 0;
      const pct = p && p.total > 0 ? Math.round((p.seen / p.total) * 100) : 0;
      return !locked && pct < 100;
    });
    if (idx > 0) {
      scenarioScroll.current?.scrollTo({ x: idx * (CARD_W + CARD_GAP), animated: false });
    }
  }, [stats, deck]);

  const toStudy = stats ? stats.dueCount + stats.freshAvailable : 0;

  const quickActions = [
    { emoji: '🎵', label: 'Tones', onPress: onToneTrainer, hint: 'Opens the tone trainer' },
    { emoji: '📖', label: 'Sentences', onPress: onSentences, hint: 'Opens your sentence library' },
    {
      emoji: '🀄',
      label: 'HSK',
      onPress: () => onStudyDeck(zhHsk),
      hint: 'Starts a speaking session with the HSK ladder deck',
    },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <GlowEllipse style={styles.headerGlow} />

      <View style={styles.inner}>
        {/* Header — wordmark + streak pill */}
        <View style={styles.headerRow}>
          <Text style={styles.wordmark}>⚡ XpressLingua</Text>
          <LinearGradient
            colors={tokens.game.streakGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.streakPill}
          >
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakCount}>{stats?.streak ?? 0}</Text>
          </LinearGradient>
        </View>

        {/* Hero "Continue" tile with gradient border glow */}
        <LinearGradient
          colors={tokens.brand.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBorder}
        >
          <View style={styles.heroTile}>
            <Text style={styles.heroKicker}>🇨🇳 Mandarin — Survival Deck</Text>
            <View style={styles.heroCountRow}>
              <Text style={styles.heroCount}>{stats ? toStudy : '–'}</Text>
              <Text style={styles.heroCountLabel}>
                {stats
                  ? `cards ready\n${stats.dueCount} due · ${stats.freshAvailable} new`
                  : 'loading…'}
              </Text>
            </View>
            <ChunkyButton
              label={toStudy === 0 && stats ? 'All done for today 🎉' : 'Start session'}
              gradient={tokens.brand.gradient}
              edge={tokens.brand.primaryDown}
              textColor={tokens.text.onCard}
              disabled={!stats || toStudy === 0}
              onPress={onStart}
              accessibilityHint="Starts a speaking session"
            />
          </View>
        </LinearGradient>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          {quickActions.map((q) => (
            <Pressable
              key={q.label}
              style={styles.quickChip}
              onPress={q.onPress}
              accessibilityRole="button"
              accessibilityLabel={q.label}
              accessibilityHint={q.hint}
            >
              <Text style={styles.quickEmoji}>{q.emoji}</Text>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Voice warning — moot once pre-rendered clips exist */}
        {!voiceOk && builtinClips === 0 && (
          <View style={styles.warnBanner}>
            <Text style={styles.warnIcon}>⚠️</Text>
            <Text style={styles.warnText} numberOfLines={2}>
              No Mandarin voice found in this browser yet. Chrome or Edge usually has one —
              audio may use a default voice until then.
            </Text>
          </View>
        )}

        {/* Scenarios — sequential unlock: finish one to open the next */}
        <Text style={styles.sectionTitle}>Conversations</Text>
      </View>

      <ScrollView
        ref={scenarioScroll}
        horizontal
        snapToInterval={CARD_W + CARD_GAP}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        style={styles.scenarioScroll}
        contentContainerStyle={styles.scenarioScrollContent}
      >
        {deck.scenarios.map((sc, i) => {
          const p = stats?.perScenario[sc.id];
          const pct = p && p.total > 0 ? Math.round((p.seen / p.total) * 100) : 0;
          const locked = p ? !p.unlocked : i > 0;
          const prevTitle = i > 0 ? deck.scenarios[i - 1].title : '';
          return (
            <View key={sc.id} style={[styles.scenarioCard, locked && styles.scenarioCardLocked]}>
              <View
                style={[
                  styles.scenarioEmojiWrap,
                  {
                    backgroundColor: locked
                      ? 'rgba(255,255,255,0.06)'
                      : SCENARIO_TINTS[i % SCENARIO_TINTS.length],
                  },
                ]}
              >
                <Text style={[styles.scenarioEmoji, locked && styles.scenarioEmojiLocked]}>
                  {locked ? '🔒' : sc.emoji}
                </Text>
              </View>
              <Text
                style={[styles.scenarioTitle, locked && styles.scenarioTitleLocked]}
                numberOfLines={2}
              >
                {sc.title}
              </Text>
              {locked ? (
                <Text style={styles.scenarioLockHint} numberOfLines={2}>
                  Finish {prevTitle}
                </Text>
              ) : (
                <View style={styles.scenarioBarRow}>
                  <View style={styles.scenarioBarWrap}>
                    <GradientBar pct={pct} height={6} />
                  </View>
                  <Text style={styles.scenarioPct}>{pct}%</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.bg.base },
  content: { paddingTop: 16, paddingBottom: 88 },
  headerGlow: { top: -140, alignSelf: 'center' },
  inner: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmark: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    letterSpacing: 1,
    color: tokens.text.secondary,
    textTransform: 'uppercase',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: tokens.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  streakEmoji: { fontSize: 16 },
  streakCount: {
    fontFamily: fonts.stat,
    fontSize: 16,
    color: '#FFFFFF',
  },
  heroBorder: {
    borderRadius: tokens.radius.tile + 1.5,
    padding: 1.5,
    shadowColor: tokens.brand.primary,
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heroTile: {
    backgroundColor: tokens.bg.elevated,
    borderRadius: tokens.radius.tile,
    padding: 20,
    gap: 8,
  },
  heroKicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: tokens.text.secondary,
  },
  heroCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  heroCount: {
    fontFamily: fonts.stat,
    fontSize: 44,
    color: tokens.game.xpGold,
  },
  heroCountLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 19,
    color: tokens.text.secondary,
  },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickChip: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: tokens.radius.button,
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    ...shadows.tile,
  },
  quickEmoji: { fontSize: 22 },
  quickLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: tokens.text.secondary,
  },
  warnBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: tokens.semantic.warnBg,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    borderRadius: tokens.radius.button,
    padding: 10,
    alignItems: 'flex-start',
  },
  warnIcon: { fontSize: 16 },
  warnText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: '#FDE8B0',
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: tokens.text.primary,
    marginTop: 12,
  },
  scenarioScroll: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    marginTop: 12,
    flexGrow: 0,
  },
  scenarioScrollContent: {
    paddingHorizontal: 20,
    gap: CARD_GAP,
  },
  scenarioCard: {
    width: CARD_W,
    minHeight: 140,
    backgroundColor: tokens.bg.raised,
    borderRadius: tokens.radius.tile,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    padding: 12,
    gap: 8,
    ...shadows.tile,
  },
  scenarioCardLocked: { opacity: 0.6 },
  scenarioEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scenarioEmoji: { fontSize: 22 },
  scenarioEmojiLocked: { fontSize: 18 },
  scenarioTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    lineHeight: 18,
    color: tokens.text.primary,
    flex: 1,
  },
  scenarioTitleLocked: { color: tokens.text.secondary },
  scenarioLockHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 15,
    color: tokens.text.muted,
  },
  scenarioBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scenarioBarWrap: { flex: 1 },
  scenarioPct: {
    fontFamily: fonts.stat,
    fontSize: 12,
    color: tokens.text.secondary,
  },
});
