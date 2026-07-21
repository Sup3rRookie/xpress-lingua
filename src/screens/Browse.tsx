import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DeckItem } from '../data/types';
import { zhHsk } from '../data/zh-hsk';
import { zhSurvival } from '../data/zh-survival';
import { playText } from '../lib/audio';
import { exampleFor } from '../lib/sentences';
import { fonts, shadows, tokens } from '../theme';
import TonePinyin from '../components/TonePinyin';

const TABS = [
  { id: 'survival', label: '🇨🇳 Survival' },
  { id: 'hsk1', label: 'HSK 1' },
  { id: 'hsk2', label: 'HSK 2' },
  { id: 'hsk3', label: 'HSK 3' },
  { id: 'hsk4', label: 'HSK 4' },
];

function Row({ item }: { item: DeckItem }) {
  const [open, setOpen] = useState(false);
  const ex = open ? exampleFor(item.id) : undefined;
  return (
    <Pressable
      style={styles.row}
      onPress={() => setOpen((o) => !o)}
      accessibilityRole="button"
      accessibilityHint="Shows the example sentence"
    >
      <View style={styles.rowTop}>
        <Pressable
          style={styles.playBtn}
          onPress={() => playText(item.id, item.hanzi, 'zh-CN')}
          accessibilityRole="button"
          accessibilityLabel={`Play ${item.hanzi}`}
        >
          <Text style={styles.playIcon}>▶</Text>
        </Pressable>
        <Text style={styles.hanzi}>{item.hanzi}</Text>
        <View style={styles.rowBody}>
          <TonePinyin pinyin={item.pinyin} size={13} dark />
        </View>
        <Text style={styles.gloss} numberOfLines={open ? 4 : 1}>
          {item.gloss}
        </Text>
      </View>
      {open && exampleFor(item.id) && (
        <View style={styles.exampleBox}>
          <Pressable
            onPress={() => {
              const e = exampleFor(item.id)!;
              playText(e.id, e.hanzi, 'zh-CN');
            }}
            accessibilityRole="button"
            accessibilityLabel="Play example sentence"
          >
            <Text style={styles.exampleHanzi}>
              {ex?.hanzi} <Text style={styles.examplePlay}>▶</Text>
            </Text>
          </Pressable>
          {ex && <TonePinyin pinyin={ex.pinyin} size={12} dark />}
          <Text style={styles.exampleGloss}>{ex?.gloss}</Text>
        </View>
      )}
    </Pressable>
  );
}

// Peek at any deck level without studying it — the syllabus is optional.
export default function Browse({ onDone }: { onDone: () => void }) {
  const [tab, setTab] = useState('hsk1');
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const source =
      tab === 'survival'
        ? zhSurvival.items
        : zhHsk.items.filter((it) => it.scenario === tab);
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (it) =>
        it.hanzi.includes(q) ||
        it.pinyin.toLowerCase().includes(q) ||
        it.gloss.toLowerCase().includes(q),
    );
  }, [tab, query]);

  return (
    <View style={styles.screen}>
      <View style={styles.inner}>
        <View style={styles.topBar}>
          <Pressable onPress={onDone} style={styles.backBtn} accessibilityRole="button">
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Browse</Text>
        </View>
        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              style={[styles.tabChip, tab === t.id && styles.tabChipActive]}
              onPress={() => setTab(t.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === t.id }}
            >
              <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search hanzi, pinyin or meaning…"
          placeholderTextColor={tokens.text.muted}
          accessibilityLabel="Search words"
        />
        <Text style={styles.count}>
          {items.length} word{items.length === 1 ? '' : 's'} · tap a row for its sentence
        </Text>
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => <Row item={item} />}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 40, gap: 8 }}
          initialNumToRender={20}
          windowSize={7}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.bg.base },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  backBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: tokens.text.secondary },
  title: { fontFamily: fonts.display, fontSize: 26, color: tokens.text.primary },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tabChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  tabChipActive: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderColor: tokens.brand.primary,
  },
  tabText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: tokens.text.secondary },
  tabTextActive: { color: tokens.text.primary },
  search: {
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    borderRadius: tokens.radius.button,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: tokens.text.primary,
  },
  count: { fontFamily: fonts.bodyMedium, fontSize: 12, color: tokens.text.muted },
  list: { flex: 1 },
  row: {
    backgroundColor: tokens.bg.raised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    padding: 12,
    gap: 8,
    ...shadows.tile,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 1,
    borderColor: tokens.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: tokens.brand.cyan, fontSize: 12 },
  hanzi: { fontFamily: fonts.hanzi, fontSize: 18, color: tokens.text.primary },
  rowBody: { flexShrink: 0 },
  gloss: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: tokens.text.secondary,
  },
  exampleBox: {
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.08)',
    padding: 10,
    gap: 4,
    alignItems: 'flex-start',
  },
  exampleHanzi: { fontFamily: fonts.hanzi, fontSize: 15, color: tokens.text.primary },
  examplePlay: { color: tokens.brand.cyan, fontSize: 12 },
  exampleGloss: { fontFamily: fonts.bodyMedium, fontSize: 12, color: tokens.text.secondary },
});
