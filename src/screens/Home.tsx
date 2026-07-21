import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Deck } from '../data/types';
import { initVoice } from '../lib/audio';
import { deckStats, DeckStats } from '../lib/srs';
import { colors } from '../theme';

const UPCOMING = [
  { label: 'Japanese', emoji: '🇯🇵' },
  { label: 'Spanish', emoji: '🇪🇸' },
  { label: 'Arabic (Egyptian)', emoji: '🇪🇬' },
  { label: 'Korean', emoji: '🇰🇷' },
  { label: 'French', emoji: '🇫🇷' },
  { label: 'Arabic (Levantine)', emoji: '🇱🇧' },
];

export default function Home({ deck, onStart }: { deck: Deck; onStart: () => void }) {
  const [stats, setStats] = useState<DeckStats | null>(null);
  const [voiceOk, setVoiceOk] = useState(true);

  const refresh = useCallback(() => {
    deckStats(deck).then(setStats);
    initVoice(deck.ttsLocale).then(setVoiceOk);
  }, [deck]);

  useEffect(refresh, [refresh]);

  const toStudy = stats ? stats.dueCount + stats.freshAvailable : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.logo}>⚡ XpressLingua</Text>
      <Text style={styles.tagline}>Speak first. Every card out loud.</Text>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>🔥 {stats?.streak ?? 0}</Text>
          <Text style={styles.statLabel}>day streak</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats?.totalReviews ?? 0}</Text>
          <Text style={styles.statLabel}>phrases spoken</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>
            {stats?.learned ?? 0}/{stats?.total ?? 0}
          </Text>
          <Text style={styles.statLabel}>cards met</Text>
        </View>
      </View>

      <View style={styles.deckCard}>
        <Text style={styles.deckTitle}>🇨🇳 Mandarin — Survival Deck</Text>
        <Text style={styles.deckSub}>
          {stats
            ? `${stats.dueCount} due · ${stats.freshAvailable} new available today`
            : 'Loading…'}
        </Text>
        <Pressable
          style={[styles.startBtn, toStudy === 0 && styles.startBtnDisabled]}
          onPress={onStart}
          disabled={toStudy === 0}
        >
          <Text style={styles.startBtnText}>
            {toStudy === 0 ? 'All done for today 🎉' : `Start session (${toStudy} cards)`}
          </Text>
        </Pressable>
      </View>

      {!voiceOk && (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>
            ⚠️ No Mandarin voice found in this browser yet. Chrome or Edge usually has one —
            audio may use a default voice until then.
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Conversations unlocked</Text>
      {deck.scenarios.map((sc) => {
        const p = stats?.perScenario[sc.id];
        const pct = p && p.total > 0 ? Math.round((p.seen / p.total) * 100) : 0;
        return (
          <View key={sc.id} style={styles.scenarioRow}>
            <Text style={styles.scenarioEmoji}>{sc.emoji}</Text>
            <View style={styles.scenarioBody}>
              <Text style={styles.scenarioTitle}>{sc.title}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
            </View>
            <Text style={styles.scenarioPct}>{pct}%</Text>
          </View>
        );
      })}

      <Text style={styles.sectionTitle}>Coming next</Text>
      <View style={styles.upcomingRow}>
        {UPCOMING.map((l) => (
          <View key={l.label} style={styles.upcomingChip}>
            <Text style={styles.upcomingText}>
              {l.emoji} {l.label} 🔒
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 48, alignItems: 'center', gap: 12 },
  logo: { fontSize: 34, fontWeight: '900', color: colors.textLight },
  tagline: { fontSize: 15, color: colors.textMuted, marginBottom: 8 },
  statRow: { flexDirection: 'row', gap: 10, width: '100%', maxWidth: 480 },
  statBox: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  statNum: { fontSize: 20, fontWeight: '800', color: colors.textLight },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  deckCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  deckTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  deckSub: { fontSize: 14, color: '#EDE9FE' },
  startBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  startBtnDisabled: { opacity: 0.7 },
  startBtnText: { color: colors.primaryDark, fontWeight: '800', fontSize: 16 },
  warnBox: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#422006',
    borderRadius: 14,
    padding: 12,
  },
  warnText: { color: '#FDE68A', fontSize: 13 },
  sectionTitle: {
    width: '100%',
    maxWidth: 480,
    fontSize: 17,
    fontWeight: '800',
    color: colors.textLight,
    marginTop: 14,
  },
  scenarioRow: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  scenarioEmoji: { fontSize: 26 },
  scenarioBody: { flex: 1, gap: 6 },
  scenarioTitle: { color: colors.textLight, fontWeight: '600', fontSize: 15 },
  barTrack: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.accent, borderRadius: 3 },
  scenarioPct: { color: colors.textMuted, fontSize: 13, width: 38, textAlign: 'right' },
  upcomingRow: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 30,
  },
  upcomingChip: {
    backgroundColor: colors.bgCard,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  upcomingText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
