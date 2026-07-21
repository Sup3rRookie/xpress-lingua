import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { zhSurvival } from '../data/zh-survival';
import { SentenceEntry } from '../data/zh-sentences';
import { playText, speak } from '../lib/audio';
import { deckStats } from '../lib/srs';
import { GeneratedSentence, generateSentences, unlockedSentences } from '../lib/sentences';
import { fonts, shadows, tokens } from '../theme';
import ChunkyButton from '../components/ChunkyButton';
import GlowEllipse from '../components/GlowEllipse';
import TonePinyin from '../components/TonePinyin';

type Tab = 'learned' | 'mix';
const GEN_COUNT = 6;

function SentenceRow({
  id,
  hanzi,
  pinyin,
  gloss,
}: {
  id?: string; // curated sentences have rendered audio; generated ones use TTS
  hanzi: string;
  pinyin: string;
  gloss: string;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.playBtn}
        onPress={() =>
          id ? playText(id, hanzi, zhSurvival.ttsLocale) : speak(hanzi, zhSurvival.ttsLocale)
        }
        accessibilityRole="button"
        accessibilityLabel={`Play ${hanzi}`}
      >
        <Text style={styles.playIcon}>▶</Text>
      </Pressable>
      <View style={styles.rowBody}>
        <Text style={styles.hanzi}>{hanzi}</Text>
        <TonePinyin pinyin={pinyin} size={14} dark />
        <Text style={styles.gloss}>{gloss}</Text>
      </View>
    </View>
  );
}

export default function Sentences({
  onDone,
  initialTab,
}: {
  onDone: () => void;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'learned');
  const [metIds, setMetIds] = useState<Set<string> | null>(null);
  const [scenario, setScenario] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedSentence[]>([]);

  useEffect(() => {
    deckStats(zhSurvival).then((s) => {
      setMetIds(s.metIds);
      setGenerated(generateSentences(s.metIds, GEN_COUNT));
    });
  }, []);

  const learned: SentenceEntry[] = useMemo(
    () => (metIds ? unlockedSentences(metIds) : []),
    [metIds],
  );
  const filtered = scenario ? learned.filter((s) => s.scenario === scenario) : learned;
  const scenariosPresent = zhSurvival.scenarios.filter((sc) =>
    learned.some((s) => s.scenario === sc.id),
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <GlowEllipse style={styles.glow} />
      <View style={styles.inner}>
        <View style={styles.topBar}>
          <Pressable onPress={onDone} style={styles.backBtn} accessibilityRole="button">
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Sentences</Text>
        <Text style={styles.subtitle}>
          Words in action — every sentence uses only what you've learned.
        </Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabChip, tab === 'learned' && styles.tabChipActive]}
            onPress={() => setTab('learned')}
            accessibilityRole="button"
          >
            <Text style={[styles.tabText, tab === 'learned' && styles.tabTextActive]}>
              📖 Learned ({learned.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabChip, tab === 'mix' && styles.tabChipActive]}
            onPress={() => setTab('mix')}
            accessibilityRole="button"
          >
            <Text style={[styles.tabText, tab === 'mix' && styles.tabTextActive]}>
              🎲 Mix it up
            </Text>
          </Pressable>
        </View>

        {tab === 'learned' && (
          <>
            {scenariosPresent.length > 1 && (
              <View style={styles.filterRow}>
                <Pressable
                  style={[styles.filterChip, scenario === null && styles.filterChipActive]}
                  onPress={() => setScenario(null)}
                >
                  <Text style={styles.filterText}>All</Text>
                </Pressable>
                {scenariosPresent.map((sc) => (
                  <Pressable
                    key={sc.id}
                    style={[styles.filterChip, scenario === sc.id && styles.filterChipActive]}
                    onPress={() => setScenario(sc.id)}
                  >
                    <Text style={styles.filterText}>
                      {sc.emoji} {sc.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {filtered.map((s) => (
              <SentenceRow key={s.id} id={s.id} hanzi={s.hanzi} pinyin={s.pinyin} gloss={s.gloss} />
            ))}
            {metIds && filtered.length === 0 && (
              <Text style={styles.emptyText}>
                No sentences unlocked here yet — every card you learn unlocks the sentences
                built from it. Keep going! 🔓
              </Text>
            )}
          </>
        )}

        {tab === 'mix' && (
          <>
            <Text style={styles.mixNote}>
              Freshly generated from YOUR learned words — say each one out loud, then tap ▶
              to compare.
            </Text>
            {generated.map((s) => (
              <SentenceRow key={s.id} hanzi={s.hanzi} pinyin={s.pinyin} gloss={s.gloss} />
            ))}
            {metIds && generated.length === 0 && (
              <Text style={styles.emptyText}>
                Learn a few more words first — the generator needs them as building blocks.
              </Text>
            )}
            {generated.length > 0 && (
              <ChunkyButton
                label="🎲 Shuffle new sentences"
                face={tokens.bg.elevated}
                edge="#141031"
                textColor={tokens.text.primary}
                onPress={() => metIds && setGenerated(generateSentences(metIds, GEN_COUNT))}
              />
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
  tabRow: { flexDirection: 'row', gap: 8 },
  tabChip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
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
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  filterChipActive: {
    backgroundColor: 'rgba(34,211,238,0.14)',
    borderColor: 'rgba(34,211,238,0.4)',
  },
  filterText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: tokens.text.secondary },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: tokens.bg.raised,
    borderRadius: tokens.radius.tile,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    padding: 14,
    alignItems: 'flex-start',
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
    marginTop: 2,
  },
  playIcon: { color: tokens.brand.cyan, fontSize: 14 },
  rowBody: { flex: 1, gap: 4, alignItems: 'flex-start' },
  hanzi: { fontFamily: fonts.hanzi, fontSize: 22, color: tokens.text.primary },
  gloss: { fontFamily: fonts.bodyMedium, fontSize: 13, color: tokens.text.secondary },
  emptyText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
    color: tokens.text.secondary,
  },
  mixNote: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: tokens.text.secondary,
  },
});
