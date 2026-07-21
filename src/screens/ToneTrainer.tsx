import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { zhSurvival } from '../data/zh-survival';
import { zhHsk } from '../data/zh-hsk';
import { DeckItem } from '../data/types';
import { playText, speak } from '../lib/audio';
import { deckStats } from '../lib/srs';
import { syllables, toneOf, TONE_COLORS_DARK } from '../lib/pinyin';
import { fonts, hanziSize, shadows, springs, tokens } from '../theme';
import { useReducedMotion } from '../lib/motion';
import ChunkyButton from '../components/ChunkyButton';
import GradientBar from '../components/GradientBar';
import GlowEllipse from '../components/GlowEllipse';
import TonePinyin from '../components/TonePinyin';
import Confetti from '../components/Confetti';

// ---------------------------------------------------------------------------
// Tone Trainer — Mandarin ear training. Three modes:
//   quiz   — hear a 1-2 syllable word, pick its tone pattern (10-question rounds)
//   pairs  — hear a word, pick it among confusable minimal-pair distractors
//   shadow — pure listen-and-repeat reps over met (SRS-seen) items
// ---------------------------------------------------------------------------

type Mode = 'quiz' | 'pairs' | 'shadow';
const ROUND_LEN = 10;
const LOCALE = zhSurvival.ttsLocale; // 'zh-CN'

const TONE_GLYPHS: Record<number, string> = { 1: 'ˉ', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ', 5: '·' };
const TONE_LABELS: Record<number, string> = {
  1: '1st tone (flat)',
  2: '2nd (rising)',
  3: '3rd (dip)',
  4: '4th (falling)',
  5: 'neutral',
};

// "nǐ" -> "ni": drop combining diacritics so bases can be compared / displayed plain.
function stripTones(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Static pools, computed once at module load.
const ALL_ITEMS: DeckItem[] = [...zhSurvival.items, ...zhHsk.items];

// Quiz pool: short words whose every syllable carries a real (1-4) tone — a
// neutral-tone syllable would have no correct option among the 4 tone patterns.
const QUIZ_POOL: DeckItem[] = ALL_ITEMS.filter((it) => {
  if (!it.pinyin.trim()) return false;
  const syls = syllables(it.pinyin);
  return syls.length >= 1 && syls.length <= 2 && syls.every((s) => toneOf(s) !== 5);
});

// Minimal-pairs / shadowing pool: anything with a pinyin line.
const PAIR_POOL: DeckItem[] = ALL_ITEMS.filter((it) => it.pinyin.trim().length > 0);

// ----- question builders ----------------------------------------------------

interface QuizQ {
  item: DeckItem;
  bases: string[]; // tone-stripped syllables, e.g. ['ni', 'hao']
  options: number[][]; // 4 tone patterns, one per answer tile
  correct: number; // index into options
}

function makeQuizQ(): QuizQ {
  const item = pick(QUIZ_POOL);
  const syls = syllables(item.pinyin);
  const bases = syls.map(stripTones);
  const correctTones = syls.map(toneOf);
  let options: number[][];
  if (syls.length === 1) {
    options = shuffle([[1], [2], [3], [4]]);
  } else {
    const seen = new Set<string>([correctTones.join('')]);
    const opts: number[][] = [correctTones];
    while (opts.length < 4) {
      const combo = [1 + Math.floor(Math.random() * 4), 1 + Math.floor(Math.random() * 4)];
      const key = combo.join('');
      if (!seen.has(key)) {
        seen.add(key);
        opts.push(combo);
      }
    }
    options = shuffle(opts);
  }
  const target = correctTones.join('');
  return { item, bases, options, correct: options.findIndex((o) => o.join('') === target) };
}

interface PairQ {
  item: DeckItem;
  options: DeckItem[];
  correct: number;
}

// Distractors, most-confusable first: same syllable count + same first-syllable
// base (tones stripped), then same syllable count, then anything.
function makePairQ(): PairQ {
  const item = pick(PAIR_POOL);
  const itemSyls = syllables(item.pinyin);
  const n = itemSyls.length;
  const firstBase = stripTones(itemSyls[0] ?? '');
  const others = PAIR_POOL.filter((it) => it.id !== item.id && it.hanzi !== item.hanzi);
  const tier1 = others.filter((it) => {
    const s = syllables(it.pinyin);
    return s.length === n && stripTones(s[0] ?? '') === firstBase;
  });
  const tier2 = others.filter((it) => syllables(it.pinyin).length === n);
  const chosen: DeckItem[] = [];
  const used = new Set<string>([item.hanzi]);
  for (const tier of [tier1, tier2, others]) {
    for (const cand of shuffle(tier)) {
      if (chosen.length >= 3) break;
      if (used.has(cand.hanzi)) continue;
      used.add(cand.hanzi);
      chosen.push(cand);
    }
    if (chosen.length >= 3) break;
  }
  const options = shuffle([item, ...chosen]);
  return { item, options, correct: options.findIndex((o) => o.id === item.id) };
}

// ----- answer tile ----------------------------------------------------------

type TileState = 'idle' | 'correct' | 'wrong' | 'reveal' | 'locked';

function AnswerTile({
  state,
  onPress,
  disabled,
  accessibilityLabel,
  children,
}: {
  state: TileState;
  onPress: () => void;
  disabled: boolean;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  const springTo = (v: number) => {
    if (reduced) {
      scale.setValue(v);
      return;
    }
    Animated.spring(scale, { toValue: v, ...springs.snappy, useNativeDriver: false }).start();
  };

  useEffect(() => {
    if (reduced) return;
    if (state === 'correct') {
      // small pop
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 110, useNativeDriver: false }),
        Animated.spring(scale, { toValue: 1, ...springs.bouncy, useNativeDriver: false }),
      ]).start();
    } else if (state === 'wrong') {
      // shake
      shake.setValue(0);
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: false }),
        Animated.timing(shake, { toValue: -1, duration: 90, useNativeDriver: false }),
        Animated.timing(shake, { toValue: 1, duration: 90, useNativeDriver: false }),
        Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: false }),
      ]).start();
    }
  }, [state, reduced, scale, shake]);

  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] });

  const stateStyle =
    state === 'correct' || state === 'reveal'
      ? styles.tileCorrect
      : state === 'wrong'
        ? styles.tileWrong
        : null;
  const icon = state === 'correct' || state === 'reveal' ? '✓' : state === 'wrong' ? '✗' : null;
  const iconColor = state === 'wrong' ? tokens.semantic.danger : tokens.semantic.success;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => springTo(0.96)}
      onPressOut={() => springTo(1)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <Animated.View
        style={[
          styles.tile,
          stateStyle,
          state === 'locked' && styles.tileLocked,
          { transform: [{ scale }, { translateX }] },
        ]}
      >
        <View style={styles.tileBody}>{children}</View>
        {icon ? <Text style={[styles.tileIcon, { color: iconColor }]}>{icon}</Text> : null}
      </Animated.View>
    </Pressable>
  );
}

// ----- screen ---------------------------------------------------------------

export default function ToneTrainer({
  onDone,
  initialMode,
}: {
  onDone: () => void;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode ?? 'quiz');
  const [phase, setPhase] = useState<'question' | 'result'>('question');
  const [qNum, setQNum] = useState(0); // 0-based within the round
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [quizQ, setQuizQ] = useState<QuizQ>(() => makeQuizQ());
  const [pairQ, setPairQ] = useState<PairQ>(() => makePairQ());

  // Shadow mode: prefer items the learner has already met in SRS.
  const [shadowPool, setShadowPool] = useState<DeckItem[]>(PAIR_POOL);
  const [shadowItem, setShadowItem] = useState<DeckItem | null>(
    initialMode === 'shadow' ? pick(PAIR_POOL) : null,
  );
  const [reps, setReps] = useState(0);

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([deckStats(zhSurvival), deckStats(zhHsk)]).then(([a, b]) => {
      if (!live) return;
      const met = new Set<string>();
      a.metIds.forEach((id) => met.add(id));
      b.metIds.forEach((id) => met.add(id));
      const pool = PAIR_POOL.filter((it) => met.has(it.id));
      if (pool.length > 0) setShadowPool(pool);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  // Auto-play the current prompt whenever it changes.
  const audioItem =
    phase === 'result'
      ? null
      : mode === 'quiz'
        ? quizQ.item
        : mode === 'pairs'
          ? pairQ.item
          : shadowItem;
  useEffect(() => {
    if (audioItem) playText(audioItem.id, audioItem.hanzi, LOCALE);
  }, [audioItem]);

  const correctIdx = mode === 'quiz' ? quizQ.correct : pairQ.correct;
  const currentItem = mode === 'quiz' ? quizQ.item : pairQ.item;
  const wasWrong = answered !== null && answered !== correctIdx;

  function newQuestion(m: Mode) {
    if (m === 'quiz') setQuizQ(makeQuizQ());
    else if (m === 'pairs') setPairQ(makePairQ());
  }

  function switchMode(m: Mode) {
    if (m === mode) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setMode(m);
    setPhase('question');
    setQNum(0);
    setScore(0);
    setAnswered(null);
    if (m === 'shadow') setShadowItem(pick(shadowPool));
    else newQuestion(m);
  }

  function restartRound() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setPhase('question');
    setQNum(0);
    setScore(0);
    setAnswered(null);
    newQuestion(mode);
  }

  function next() {
    if (qNum + 1 >= ROUND_LEN) {
      setPhase('result');
      return;
    }
    setQNum((n) => n + 1);
    setAnswered(null);
    newQuestion(mode);
  }

  function answer(idx: number) {
    if (answered !== null) return;
    setAnswered(idx);
    if (idx === correctIdx) {
      setScore((s) => s + 1);
      advanceTimer.current = setTimeout(next, 700);
    }
  }

  function tileState(i: number): TileState {
    if (answered === null) return 'idle';
    if (i === correctIdx) return answered === correctIdx ? 'correct' : 'reveal';
    if (i === answered) return 'wrong';
    return 'locked';
  }

  function nextShadow() {
    setReps((r) => r + 1);
    setShadowItem((prev) => {
      if (shadowPool.length <= 1) return pick(shadowPool);
      let cand = pick(shadowPool);
      while (prev && cand.id === prev.id) cand = pick(shadowPool);
      return cand;
    });
  }

  const encouragement =
    score >= 10
      ? 'Perfect ear — native-level listening! 🏆'
      : score >= 8
        ? 'Sharp ears! Tones are sticking. 🎯'
        : score >= 6
          ? 'Solid — a few more rounds and it clicks.'
          : score >= 4
            ? 'Getting there. Listen for the pitch shape, not the syllable.'
            : 'Tones are the hard part — replay each answer and go again.';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <GlowEllipse style={styles.glow} />
      {phase === 'result' && score >= 8 && <Confetti />}
      <View style={styles.inner}>
        <View style={styles.topBar}>
          <Pressable onPress={onDone} style={styles.backBtn} accessibilityRole="button">
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Tone Trainer</Text>
        <Text style={styles.subtitle}>Train your ear — hear the tone before you say it.</Text>

        {/* Mode chips */}
        <View style={styles.tabRow}>
          {(
            [
              ['quiz', '🎵 Tone Quiz'],
              ['pairs', '👂 Which word?'],
              ['shadow', '🗣️ Repeat after me'],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <Pressable
              key={m}
              style={[styles.tabChip, mode === m && styles.tabChipActive]}
              onPress={() => switchMode(m)}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: mode === m }}
            >
              <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ---------------- shadow mode ---------------- */}
        {mode === 'shadow' && shadowItem && (
          <>
            <Text style={styles.repCounter}>
              {reps} rep{reps === 1 ? '' : 's'} this session
            </Text>
            <View style={styles.shadowTile}>
              <Text style={[styles.shadowHanzi, { fontSize: hanziSize(shadowItem.hanzi) }]}>
                {shadowItem.hanzi}
              </Text>
              <TonePinyin pinyin={shadowItem.pinyin} size={18} dark />
              <Text style={styles.gloss}>{shadowItem.gloss}</Text>
            </View>
            <Text style={styles.shadowHint}>
              Listen, then say it out loud — match the pitch shape, not just the sounds.
            </Text>
            <View style={styles.shadowBtnRow}>
              <ChunkyButton
                label="🔊 Again"
                small
                face={tokens.bg.elevated}
                edge="#141031"
                textColor={tokens.text.primary}
                style={styles.shadowBtn}
                onPress={() => playText(shadowItem.id, shadowItem.hanzi, LOCALE)}
              />
              <ChunkyButton
                label="🐢 Slow"
                small
                face={tokens.bg.elevated}
                edge="#141031"
                textColor={tokens.text.primary}
                style={styles.shadowBtn}
                onPress={() => speak(shadowItem.hanzi, LOCALE, true)}
              />
              <ChunkyButton label="Next →" small style={styles.shadowBtn} onPress={nextShadow} />
            </View>
          </>
        )}

        {/* ---------------- quiz / pairs: result card ---------------- */}
        {mode !== 'shadow' && phase === 'result' && (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Round complete</Text>
            <Text style={styles.resultScore}>
              {score}
              <Text style={styles.resultScoreDen}>/{ROUND_LEN}</Text>
            </Text>
            <Text style={styles.resultLine}>{encouragement}</Text>
            <ChunkyButton label="Another round" onPress={restartRound} />
            <Pressable onPress={onDone} style={styles.ghostBtn} accessibilityRole="button">
              <Text style={styles.ghostBtnText}>Done</Text>
            </Pressable>
          </View>
        )}

        {/* ---------------- quiz / pairs: question ---------------- */}
        {mode !== 'shadow' && phase === 'question' && (
          <>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                Question {qNum + 1}/{ROUND_LEN}
              </Text>
              <Text style={styles.progressScore}>⭐ {score}</Text>
            </View>
            <GradientBar pct={(qNum / ROUND_LEN) * 100} />

            <View style={styles.promptTile}>
              <Text style={styles.promptLabel}>
                {mode === 'quiz'
                  ? 'Listen — which tone pattern do you hear?'
                  : 'Listen — which word do you hear?'}
              </Text>
              <Pressable
                style={styles.replayBtn}
                onPress={() => playText(currentItem.id, currentItem.hanzi, LOCALE)}
                accessibilityRole="button"
                accessibilityLabel="Play the audio again"
              >
                <Text style={styles.replayText}>🔊 Play again</Text>
              </Pressable>
            </View>

            {mode === 'quiz' &&
              quizQ.options.map((tones, i) => {
                const a11y = `${quizQ.bases.join(' ')} — ${tones
                  .map((t) => TONE_LABELS[t])
                  .join(' then ')}`;
                return (
                  <AnswerTile
                    key={`${quizQ.item.id}-${i}`}
                    state={tileState(i)}
                    disabled={answered !== null}
                    onPress={() => answer(i)}
                    accessibilityLabel={a11y}
                  >
                    <View style={styles.quizOptRow}>
                      <Text style={styles.quizOptSyl}>
                        {quizQ.bases.map((b, j) => (
                          <Text key={j} style={{ color: TONE_COLORS_DARK[tones[j] ?? 5] }}>
                            {j > 0 ? ' ' : ''}
                            {b}
                          </Text>
                        ))}
                      </Text>
                      <Text style={styles.quizOptLabel}>
                        {tones.length === 1
                          ? `${TONE_LABELS[tones[0]]} ${TONE_GLYPHS[tones[0]]}`
                          : tones.map((t) => TONE_GLYPHS[t]).join(' + ')}
                      </Text>
                    </View>
                  </AnswerTile>
                );
              })}

            {mode === 'pairs' &&
              pairQ.options.map((opt, i) => (
                <AnswerTile
                  key={`${pairQ.item.id}-${opt.id}`}
                  state={tileState(i)}
                  disabled={answered !== null}
                  onPress={() => answer(i)}
                  accessibilityLabel={`${opt.hanzi}, ${opt.pinyin}`}
                >
                  <View style={styles.pairOpt}>
                    <Text style={styles.pairHanzi}>{opt.hanzi}</Text>
                    <TonePinyin pinyin={opt.pinyin} size={14} dark />
                    {answered !== null && i === pairQ.correct && (
                      <Text style={styles.gloss}>{opt.gloss}</Text>
                    )}
                  </View>
                </AnswerTile>
              ))}

            {wasWrong && (
              <>
                <View style={styles.revealTile}>
                  <Text style={styles.revealHanzi}>{currentItem.hanzi}</Text>
                  <TonePinyin pinyin={currentItem.pinyin} size={18} dark />
                  <Text style={styles.gloss}>{currentItem.gloss}</Text>
                </View>
                <ChunkyButton label="Next" onPress={next} />
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.bg.base },
  content: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 48 },
  glow: { top: -140, alignSelf: 'center' },
  inner: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 12 },
  topBar: { flexDirection: 'row' },
  backBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  backBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: tokens.text.secondary },
  title: { fontFamily: fonts.display, fontSize: 32, color: tokens.text.primary },
  subtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: tokens.text.secondary,
    marginTop: -6,
  },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tabChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  tabChipActive: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderColor: tokens.brand.primary,
  },
  tabText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: tokens.text.secondary },
  tabTextActive: { color: tokens.text.primary },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: tokens.text.secondary },
  progressScore: { fontFamily: fonts.stat, fontSize: 14, color: tokens.game.xpGold },

  promptTile: {
    backgroundColor: tokens.bg.raised,
    borderRadius: tokens.radius.tile,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    padding: 16,
    alignItems: 'center',
    gap: 10,
    ...shadows.tile,
  },
  promptLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: tokens.text.secondary,
    textAlign: 'center',
  },
  replayBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 1,
    borderColor: tokens.brand.primary,
  },
  replayText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: tokens.brand.cyan },

  tile: {
    backgroundColor: tokens.bg.raised,
    borderRadius: tokens.radius.tile,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...shadows.tile,
  },
  tileCorrect: {
    backgroundColor: tokens.semantic.successBg,
    borderColor: tokens.semantic.success,
  },
  tileWrong: {
    backgroundColor: tokens.semantic.dangerBg,
    borderColor: tokens.semantic.danger,
  },
  tileLocked: { opacity: 0.5 },
  tileBody: { flex: 1 },
  tileIcon: { fontFamily: fonts.bodyBold, fontSize: 18 },

  quizOptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quizOptSyl: { fontFamily: fonts.bodySemiBold, fontSize: 20 },
  quizOptLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: tokens.text.secondary },

  pairOpt: { gap: 2, alignItems: 'flex-start' },
  pairHanzi: { fontFamily: fonts.hanzi, fontSize: 22, color: tokens.text.primary },
  gloss: { fontFamily: fonts.bodyMedium, fontSize: 13, color: tokens.text.secondary },

  revealTile: {
    backgroundColor: tokens.bg.elevated,
    borderRadius: tokens.radius.tile,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  revealHanzi: { fontFamily: fonts.hanzi, fontSize: 30, color: tokens.text.primary },

  resultCard: {
    backgroundColor: tokens.bg.raised,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
    ...shadows.card,
  },
  resultLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: tokens.text.secondary },
  resultScore: { fontFamily: fonts.stat, fontSize: 56, color: tokens.text.primary },
  resultScoreDen: { fontFamily: fonts.stat, fontSize: 28, color: tokens.text.secondary },
  resultLine: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: tokens.text.secondary,
    textAlign: 'center',
  },
  ghostBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.border.strong,
  },
  ghostBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: tokens.text.secondary },

  shadowTile: {
    backgroundColor: tokens.bg.raised,
    borderRadius: tokens.radius.tile,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    ...shadows.tile,
  },
  shadowHanzi: { fontFamily: fonts.hanzi, color: tokens.text.primary, textAlign: 'center' },
  shadowHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: tokens.text.secondary,
    textAlign: 'center',
  },
  shadowBtnRow: { flexDirection: 'row', gap: 8 },
  shadowBtn: { flex: 1 },
  repCounter: { fontFamily: fonts.stat, fontSize: 14, color: tokens.brand.cyan },
});
