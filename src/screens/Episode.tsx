import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { initBuiltinAudio, playText, stopPlayback } from '../lib/audio';
import { sentencesFor, travelPack, TravelSentence } from '../lib/travelPacks';
import { fonts, shadows, tokens } from '../theme';
import GlowEllipse from '../components/GlowEllipse';
import TonePinyin from '../components/TonePinyin';

// Episode mode: hands-free listen-and-repeat. Each line runs
//   native line -> silence to repeat -> English meaning -> slow line -> silence
// so it can be followed with the screen in your pocket. The silence is the point:
// it is where you actually speak, which is what a passive podcast never gives you.
// Order is native-first (hear the Japanese, then get the meaning).

const LINES_PER_EPISODE = 10;
// Breathing room on top of however long the native took to say it.
const REPEAT_PAD_MS = 700;
const MIN_GAP_MS = 1200;
const MAX_GAP_MS = 7000;
const BEAT_MS = 350;

type Phase = 'idle' | 'listen' | 'repeat' | 'meaning' | 'slow' | 'done';

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Ready',
  listen: '🔊 Listen',
  repeat: '🗣️ Your turn, say it now',
  meaning: '💬 Meaning',
  slow: '🐢 Again, slowly',
  done: '✅ Episode complete',
};

export default function Episode({ lang, onDone }: { lang: string; onDone: () => void }) {
  const pack = travelPack(lang);
  const isZh = pack.lang === 'zh';

  const [scenario, setScenario] = useState<string | null>(null);
  const [episode, setEpisode] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [playing, setPlaying] = useState(false);
  // The meaning stays hidden until it has been spoken. "repeat" happens twice per
  // line (before and after the meaning), so the phase alone cannot gate this: on
  // the first pass the English must not be readable, or it stops being a listening
  // test and becomes reading practice.
  const [revealed, setRevealed] = useState(false);

  // Bumped to cancel an in-flight run; every await checks it before continuing.
  const runId = useRef(0);
  // Lets a pause interrupt a silence immediately instead of waiting it out.
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gapResolve = useRef<(() => void) | null>(null);

  const lines: TravelSentence[] = useMemo(
    () => (scenario ? sentencesFor(lang, scenario) : []),
    [lang, scenario],
  );
  const episodes = useMemo(() => {
    const out: TravelSentence[][] = [];
    for (let i = 0; i < lines.length; i += LINES_PER_EPISODE) {
      out.push(lines.slice(i, i + LINES_PER_EPISODE));
    }
    return out;
  }, [lines]);
  const track = episode !== null ? (episodes[episode] ?? []) : [];
  const current = track[index];

  const clearGap = () => {
    if (gapTimer.current) clearTimeout(gapTimer.current);
    gapTimer.current = null;
    const r = gapResolve.current;
    gapResolve.current = null;
    if (r) r();
  };

  const gap = (ms: number) =>
    new Promise<void>((resolve) => {
      gapResolve.current = resolve;
      const timer = setTimeout(() => {
        // Only clear the slots if they still belong to this gap, so a newer run's
        // pending silence can't be orphaned by an older one's timer firing.
        if (gapTimer.current === timer) gapTimer.current = null;
        if (gapResolve.current === resolve) gapResolve.current = null;
        resolve();
      }, ms);
      gapTimer.current = timer;
    });

  const halt = () => {
    runId.current += 1; // invalidate any in-flight run
    clearGap();
    stopPlayback();
    setPlaying(false);
  };

  // Episode mode plays two languages, so both manifests have to be loaded before
  // the first line: the study language and English for the meaning line.
  useEffect(() => {
    initBuiltinAudio(pack.lang);
    initBuiltinAudio('en');
  }, [pack.lang]);

  // Stop audio and cancel the run when the screen goes away.
  useEffect(() => () => halt(), []);

  const run = async (from: number, list: TravelSentence[]) => {
    const mine = ++runId.current;
    const alive = () => runId.current === mine;
    setPlaying(true);
    for (let i = from; i < list.length; i += 1) {
      if (!alive()) return;
      setIndex(i);
      setRevealed(false);
      const s = list[i];

      setPhase('listen');
      const started = Date.now();
      await playText(s.id, s.hanzi, pack.ttsLocale);
      if (!alive()) return;
      // Give back as long as the native line actually took, so the pause fits the
      // sentence instead of being a fixed guess.
      const spoken = Math.min(Math.max(Date.now() - started, MIN_GAP_MS), MAX_GAP_MS);

      setPhase('repeat');
      await gap(spoken + REPEAT_PAD_MS);
      if (!alive()) return;

      setPhase('meaning');
      setRevealed(true);
      // Pre-rendered neural English ("g-" + sentence id); falls back to browser
      // speech synthesis, whose quality varies a lot by machine.
      await playText(`g-${s.id}`, s.gloss, 'en-US');
      if (!alive()) return;
      await gap(BEAT_MS);
      if (!alive()) return;

      setPhase('slow');
      await playText(`${s.id}-slow`, s.hanzi, pack.ttsLocale, true);
      if (!alive()) return;

      setPhase('repeat');
      await gap(spoken + REPEAT_PAD_MS);
      if (!alive()) return;
    }
    if (!alive()) return;
    // Past the last line, so `current` goes undefined and the completion card
    // shows instead of leaving the final line on screen.
    setIndex(list.length);
    setPhase('done');
    setPlaying(false);
  };

  const startEpisode = (n: number) => {
    halt();
    setEpisode(n);
    setIndex(0);
    setPhase('idle');
    run(0, episodes[n] ?? []);
  };

  const toggle = () => {
    if (playing) {
      halt();
      setPhase('idle');
    } else {
      halt(); // symmetry: every transition cancels the previous run itself
      // Replaying after the episode finished starts over rather than running
      // from an index that is past the end.
      run(index >= track.length ? 0 : index, track);
    }
  };

  const jump = (delta: number) => {
    const next = Math.min(Math.max(index + delta, 0), Math.max(track.length - 1, 0));
    halt();
    setIndex(next);
    run(next, track);
  };

  // ---- Scenario picker ----
  if (!scenario) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <GlowEllipse style={styles.glow} />
        <View style={styles.inner}>
          <View style={styles.topBar}>
            <Pressable onPress={onDone} style={styles.backBtn} accessibilityRole="button">
              <Text style={styles.backBtnText}>← Back</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>🎧 Listen & repeat</Text>
          <Text style={styles.subtitle}>
            Hands-free practice. You hear the line, say it back in the pause, then hear
            what it means. Works with the screen off.
          </Text>
          {pack.scenarios.map((sc) => {
            const count = sentencesFor(lang, sc.id).length;
            const eps = Math.ceil(count / LINES_PER_EPISODE);
            return (
              <Pressable
                key={sc.id}
                style={styles.card}
                onPress={() => setScenario(sc.id)}
                accessibilityRole="button"
                accessibilityLabel={sc.title}
              >
                <Text style={styles.cardEmoji}>{sc.emoji}</Text>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{sc.title}</Text>
                  <Text style={styles.cardSub}>
                    {eps} episode{eps === 1 ? '' : 's'} · {count} lines
                  </Text>
                </View>
                <Text style={styles.cardArrow}>›</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  // ---- Episode picker ----
  if (episode === null) {
    const sc = pack.scenarios.find((x) => x.id === scenario);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <GlowEllipse style={styles.glow} />
        <View style={styles.inner}>
          <View style={styles.topBar}>
            <Pressable
              onPress={() => setScenario(null)}
              style={styles.backBtn}
              accessibilityRole="button"
            >
              <Text style={styles.backBtnText}>← Scenarios</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>
            {sc?.emoji} {sc?.title}
          </Text>
          <Text style={styles.subtitle}>Each episode is about two minutes.</Text>
          {episodes.map((ep, i) => (
            <Pressable
              key={i}
              style={styles.card}
              onPress={() => startEpisode(i)}
              accessibilityRole="button"
              accessibilityLabel={`Episode ${i + 1}`}
            >
              <Text style={styles.cardEmoji}>🎧</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Episode {i + 1}</Text>
                <Text style={styles.cardSub}>{ep.length} lines</Text>
              </View>
              <Text style={styles.cardArrow}>▶</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  // ---- Player ----
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <GlowEllipse style={styles.glow} />
      <View style={styles.inner}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              halt();
              setEpisode(null);
              setIndex(0);
              setPhase('idle');
              setRevealed(false);
            }}
            style={styles.backBtn}
            accessibilityRole="button"
          >
            <Text style={styles.backBtnText}>← Episodes</Text>
          </Pressable>
          <Text style={styles.counter}>
            {Math.min(index + 1, track.length)} / {track.length}
          </Text>
        </View>

        <Text style={styles.phase}>{PHASE_LABEL[phase]}</Text>

        <View style={styles.stage}>
          {current ? (
            <>
              <Text style={styles.hanzi}>{current.hanzi}</Text>
              {isZh ? (
                <TonePinyin pinyin={current.pinyin} size={15} dark />
              ) : (
                <Text style={styles.reading}>{current.pinyin}</Text>
              )}
              {revealed ? (
                <Text style={styles.gloss}>{current.gloss}</Text>
              ) : (
                <Text style={styles.glossHidden}>· · ·</Text>
              )}
            </>
          ) : (
            <Text style={styles.doneText}>
              {phase === 'done' ? 'Episode complete. Play it again tomorrow.' : ''}
            </Text>
          )}
        </View>

        <View style={styles.controls}>
          <Pressable
            style={styles.ctrlBtn}
            onPress={() => jump(-1)}
            accessibilityRole="button"
            accessibilityLabel="Previous line"
          >
            <Text style={styles.ctrlText}>‹</Text>
          </Pressable>
          <Pressable
            style={[styles.ctrlBtn, styles.playBtn]}
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pause' : 'Play'}
          >
            <Text style={styles.playText}>{playing ? '❚❚' : '▶'}</Text>
          </Pressable>
          <Pressable
            style={styles.ctrlBtn}
            onPress={() => jump(1)}
            accessibilityRole="button"
            accessibilityLabel="Next line"
          >
            <Text style={styles.ctrlText}>›</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          Say the line out loud in the pause. Nobody is scoring you, so guess freely.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.bg.base },
  content: { paddingBottom: 40 },
  glow: { top: -120, left: -60 },
  inner: { paddingHorizontal: 18, paddingTop: 14, gap: 12 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12 },
  backBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: tokens.text.secondary },
  counter: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: tokens.text.muted },
  title: { fontFamily: fonts.display, fontSize: 24, color: tokens.text.primary },
  subtitle: { fontFamily: fonts.bodyMedium, fontSize: 13, color: tokens.text.secondary },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    ...shadows.card,
  },
  cardEmoji: { fontSize: 24 },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: tokens.text.primary },
  cardSub: { fontFamily: fonts.bodyMedium, fontSize: 12, color: tokens.text.muted },
  cardArrow: { fontSize: 18, color: tokens.brand.primary },
  phase: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: tokens.brand.primary,
    textAlign: 'center',
    marginTop: 6,
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 190,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    ...shadows.card,
  },
  hanzi: {
    fontFamily: fonts.hanzi,
    fontSize: 26,
    color: tokens.text.primary,
    textAlign: 'center',
  },
  reading: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: '#9FE8FF',
    textAlign: 'center',
  },
  gloss: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: tokens.text.secondary,
    textAlign: 'center',
  },
  glossHidden: { fontFamily: fonts.bodyMedium, fontSize: 14, color: tokens.text.muted },
  doneText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: tokens.text.secondary,
    textAlign: 'center',
  },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  ctrlBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  ctrlText: { fontSize: 24, color: tokens.text.primary },
  playBtn: { width: 68, height: 68, borderRadius: 34, backgroundColor: tokens.brand.primary },
  playText: { fontSize: 22, color: '#fff' },
  hint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: tokens.text.muted,
    textAlign: 'center',
  },
});
