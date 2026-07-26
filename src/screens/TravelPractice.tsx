import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import travel from '../data/zh-travel-sentences.json';
import { speak, stopPlayback } from '../lib/audio';
import { fonts, shadows, tokens } from '../theme';
import GlowEllipse from '../components/GlowEllipse';
import TonePinyin from '../components/TonePinyin';

interface TSentence {
  id: string;
  scenario: string;
  hanzi: string;
  pinyin: string;
  gloss: string;
  situation: string;
}
interface TScenario {
  id: string;
  title: string;
  emoji: string;
}

const SCENARIOS = travel.scenarios as TScenario[];
const SENTENCES = travel.sentences as TSentence[];
const SENTENCE_IDS = new Set(SENTENCES.map((s) => s.id));
const LOCALE = travel.ttsLocale;
const SAVED_KEY = 'xl-travel-saved';

const TINTS = [
  'rgba(139,92,246,0.16)',
  'rgba(34,211,238,0.14)',
  'rgba(255,201,74,0.14)',
  'rgba(52,211,153,0.14)',
  'rgba(251,113,133,0.14)',
];

// Listen-and-repeat (shadowing) practice for real travel scenarios. No scoring:
// you hear the native line, repeat it aloud, and can save any line to run past a
// native-speaker friend later.
export default function TravelPractice({ onDone }: { onDone: () => void }) {
  const [scenario, setScenario] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [viewSaved, setViewSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SAVED_KEY).then((v) => {
      if (!v) return;
      try {
        // Prune ids that no longer exist so the saved count can't drift from the list.
        const ids = (JSON.parse(v) as string[]).filter((id) => SENTENCE_IDS.has(id));
        setSaved(new Set(ids));
      } catch {
        // ignore corrupt value
      }
    });
  }, []);

  // Stop any audio when leaving the screen.
  useEffect(() => () => stopPlayback(), []);

  const list = useMemo(
    () => (scenario ? SENTENCES.filter((s) => s.scenario === scenario) : []),
    [scenario],
  );
  const current = scenario && index < list.length ? list[index] : null;

  // Auto-play the native line whenever the sentence changes: hear it, then repeat.
  useEffect(() => {
    if (current) speak(current.hanzi, LOCALE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const persist = (next: Set<string>) => {
    setSaved(new Set(next));
    AsyncStorage.setItem(SAVED_KEY, JSON.stringify([...next]));
  };
  const toggleSave = (id: string) => {
    const next = new Set(saved);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persist(next);
  };

  const openScenario = (id: string) => {
    setScenario(id);
    setIndex(0);
    setViewSaved(false);
  };
  const backToMenu = () => {
    stopPlayback();
    setScenario(null);
    setViewSaved(false);
  };

  // ---- Saved list ("ask a native") ----
  if (viewSaved) {
    const savedList = SENTENCES.filter((s) => saved.has(s.id));
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <GlowEllipse style={styles.glow} />
        <View style={styles.inner}>
          <View style={styles.topBar}>
            <Pressable onPress={() => setViewSaved(false)} style={styles.backBtn} accessibilityRole="button">
              <Text style={styles.backBtnText}>← Back</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>⭐ Ask a native</Text>
          <Text style={styles.subtitle}>
            Lines you saved to check with a native-speaker friend.
          </Text>
          {savedList.length === 0 && (
            <Text style={styles.emptyText}>
              Nothing saved yet. Tap ⭐ on any line while practising to add it here.
            </Text>
          )}
          {savedList.map((s) => (
            <View key={s.id} style={styles.row}>
              <Pressable
                style={styles.playBtn}
                onPress={() => speak(s.hanzi, LOCALE)}
                accessibilityRole="button"
                accessibilityLabel={`Play ${s.hanzi}`}
              >
                <Text style={styles.playIcon}>▶</Text>
              </Pressable>
              <View style={styles.rowBody}>
                <Text style={styles.rowHanzi}>{s.hanzi}</Text>
                <TonePinyin pinyin={s.pinyin} size={13} dark />
                <Text style={styles.rowGloss}>{s.gloss}</Text>
              </View>
              <Pressable
                onPress={() => toggleSave(s.id)}
                style={styles.starBtn}
                accessibilityRole="button"
                accessibilityLabel="Remove from saved"
              >
                <Text style={styles.starOn}>★</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

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
            <Pressable
              onPress={() => setViewSaved(true)}
              style={styles.savedChip}
              accessibilityRole="button"
            >
              <Text style={styles.savedChipText}>⭐ Saved {saved.size > 0 ? `(${saved.size})` : ''}</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>Travel phrases</Text>
          <Text style={styles.subtitle}>
            Pick a situation. Hear a native line, then say it out loud after.
          </Text>
          <View style={styles.grid}>
            {SCENARIOS.map((sc, i) => {
              const count = SENTENCES.filter((s) => s.scenario === sc.id).length;
              return (
                <Pressable
                  key={sc.id}
                  style={styles.card}
                  onPress={() => openScenario(sc.id)}
                  accessibilityRole="button"
                  accessibilityLabel={sc.title}
                >
                  <View style={[styles.cardEmojiWrap, { backgroundColor: TINTS[i % TINTS.length] }]}>
                    <Text style={styles.cardEmoji}>{sc.emoji}</Text>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {sc.title}
                  </Text>
                  <Text style={styles.cardCount}>{count} lines</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  }

  // ---- Shadow practice for a scenario ----
  const sc = SCENARIOS.find((x) => x.id === scenario)!;
  const atEnd = !current;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <GlowEllipse style={styles.glow} />
      <View style={styles.inner}>
        <View style={styles.topBar}>
          <Pressable onPress={backToMenu} style={styles.backBtn} accessibilityRole="button">
            <Text style={styles.backBtnText}>← Scenarios</Text>
          </Pressable>
          <Text style={styles.counter}>
            {Math.min(index + 1, list.length)} / {list.length}
          </Text>
        </View>
        <Text style={styles.scenarioHeading}>
          {sc.emoji} {sc.title}
        </Text>

        {atEnd ? (
          <View style={styles.doneCard}>
            <Text style={styles.doneEmoji}>🎉</Text>
            <Text style={styles.doneTitle}>Scenario done</Text>
            <Text style={styles.doneHint}>
              You went through every {sc.title.toLowerCase()} line. Loop again or pick another
              situation.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={() => setIndex(0)} accessibilityRole="button">
              <Text style={styles.primaryBtnText}>🔁 Practise again</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={backToMenu} accessibilityRole="button">
              <Text style={styles.secondaryBtnText}>Pick another scenario</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.sentenceCard}>
              <Text style={styles.situation}>{current.situation}</Text>
              <Text style={styles.hanzi}>{current.hanzi}</Text>
              <TonePinyin pinyin={current.pinyin} size={18} dark />
              <Text style={styles.gloss}>{current.gloss}</Text>
              <View style={styles.repeatHint}>
                <Text style={styles.repeatHintText}>🗣️ Now say it out loud</Text>
              </View>
            </View>

            <View style={styles.controls}>
              <Pressable
                style={styles.controlBtn}
                onPress={() => speak(current.hanzi, LOCALE)}
                accessibilityRole="button"
                accessibilityLabel="Play again"
              >
                <Text style={styles.controlEmoji}>🔊</Text>
                <Text style={styles.controlLabel}>Again</Text>
              </Pressable>
              <Pressable
                style={styles.controlBtn}
                onPress={() => speak(current.hanzi, LOCALE, true)}
                accessibilityRole="button"
                accessibilityLabel="Play slowly"
              >
                <Text style={styles.controlEmoji}>🐢</Text>
                <Text style={styles.controlLabel}>Slow</Text>
              </Pressable>
              <Pressable
                style={styles.controlBtn}
                onPress={() => toggleSave(current.id)}
                accessibilityRole="button"
                accessibilityLabel={saved.has(current.id) ? 'Saved to ask a native' : 'Save to ask a native'}
              >
                <Text style={styles.controlEmoji}>{saved.has(current.id) ? '★' : '⭐'}</Text>
                <Text style={styles.controlLabel}>{saved.has(current.id) ? 'Saved' : 'Save'}</Text>
              </Pressable>
            </View>

            <View style={styles.navRow}>
              <Pressable
                style={[styles.navBtn, index === 0 && styles.navBtnDisabled]}
                onPress={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                accessibilityRole="button"
                accessibilityLabel="Previous"
              >
                <Text style={styles.navBtnText}>‹ Prev</Text>
              </Pressable>
              <Pressable
                style={[styles.navBtn, styles.navBtnPrimary]}
                onPress={() => setIndex((i) => i + 1)}
                accessibilityRole="button"
                accessibilityLabel="Next"
              >
                <Text style={[styles.navBtnText, styles.navBtnTextPrimary]}>
                  {index + 1 >= list.length ? 'Finish ›' : 'Next ›'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.bg.base },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },
  glow: { top: -140, alignSelf: 'center' },
  inner: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 12 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  backBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: tokens.text.secondary },
  savedChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255,201,74,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,201,74,0.4)',
  },
  savedChipText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: tokens.game.xpGold },
  title: { fontFamily: fonts.display, fontSize: 30, color: tokens.text.primary },
  subtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 19,
    color: tokens.text.secondary,
    marginTop: -6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  card: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: tokens.bg.raised,
    borderRadius: tokens.radius.tile,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    padding: 14,
    gap: 8,
    ...shadows.tile,
  },
  cardEmojiWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: { fontSize: 24 },
  cardTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: tokens.text.primary },
  cardCount: { fontFamily: fonts.bodyMedium, fontSize: 12, color: tokens.text.muted },
  counter: { fontFamily: fonts.stat, fontSize: 14, color: tokens.text.secondary },
  scenarioHeading: { fontFamily: fonts.bodyBold, fontSize: 18, color: tokens.text.primary },
  sentenceCard: {
    backgroundColor: tokens.bg.raised,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    padding: 22,
    gap: 10,
    alignItems: 'center',
    ...shadows.card,
  },
  situation: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: tokens.text.secondary,
    textAlign: 'center',
  },
  hanzi: {
    fontFamily: fonts.hanzi,
    fontSize: 34,
    color: tokens.text.primary,
    textAlign: 'center',
    marginTop: 4,
  },
  gloss: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: tokens.text.secondary,
    textAlign: 'center',
  },
  repeatHint: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(34,211,238,0.14)',
  },
  repeatHintText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: tokens.brand.cyan },
  controls: { flexDirection: 'row', gap: 10 },
  controlBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 12,
    borderRadius: tokens.radius.button,
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    ...shadows.tile,
  },
  controlEmoji: { fontSize: 22 },
  controlLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: tokens.text.secondary },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: tokens.radius.button,
    backgroundColor: tokens.bg.elevated,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnPrimary: {
    backgroundColor: 'rgba(139,92,246,0.22)',
    borderColor: tokens.brand.primary,
  },
  navBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: tokens.text.secondary },
  navBtnTextPrimary: { color: tokens.text.primary },
  doneCard: {
    backgroundColor: tokens.bg.raised,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    padding: 24,
    gap: 10,
    alignItems: 'center',
    ...shadows.card,
  },
  doneEmoji: { fontSize: 48 },
  doneTitle: { fontFamily: fonts.display, fontSize: 24, color: tokens.text.primary },
  doneHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 19,
    color: tokens.text.secondary,
    textAlign: 'center',
  },
  primaryBtn: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: tokens.radius.button,
    backgroundColor: 'rgba(139,92,246,0.22)',
    borderWidth: 1,
    borderColor: tokens.brand.primary,
    marginTop: 6,
  },
  primaryBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: tokens.text.primary },
  secondaryBtn: { width: '100%', alignItems: 'center', paddingVertical: 11 },
  secondaryBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: tokens.text.secondary },
  emptyText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: tokens.text.secondary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: tokens.bg.raised,
    borderRadius: tokens.radius.tile,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    padding: 14,
    alignItems: 'center',
    ...shadows.tile,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 1,
    borderColor: tokens.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: tokens.brand.cyan, fontSize: 14 },
  rowBody: { flex: 1, gap: 3 },
  rowHanzi: { fontFamily: fonts.hanzi, fontSize: 20, color: tokens.text.primary },
  rowGloss: { fontFamily: fonts.bodyMedium, fontSize: 13, color: tokens.text.secondary },
  starBtn: { padding: 4 },
  starOn: { fontSize: 20, color: tokens.game.xpGold },
});
