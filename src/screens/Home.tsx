import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Deck } from '../data/types';
import { initVoice } from '../lib/audio';
import { deckStats, DeckStats } from '../lib/srs';
import { fonts, shadows, tokens } from '../theme';
import ChunkyButton from '../components/ChunkyButton';
import GradientBar from '../components/GradientBar';
import GlowEllipse from '../components/GlowEllipse';

const UPCOMING = [
  { label: 'Japanese', emoji: '🇯🇵' },
  { label: 'Spanish', emoji: '🇪🇸' },
  { label: 'Arabic (Egyptian)', emoji: '🇪🇬' },
  { label: 'Korean', emoji: '🇰🇷' },
  { label: 'French', emoji: '🇫🇷' },
  { label: 'Arabic (Levantine)', emoji: '🇱🇧' },
];

// Accent tints cycled across scenario emoji chips.
const SCENARIO_TINTS = [
  'rgba(139,92,246,0.16)',
  'rgba(34,211,238,0.14)',
  'rgba(255,201,74,0.14)',
  'rgba(52,211,153,0.14)',
  'rgba(251,113,133,0.14)',
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
  const metPct =
    stats && stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <GlowEllipse style={styles.headerGlow} />

      <View style={styles.inner}>
        {/* Header */}
        <Text style={styles.wordmark}>⚡ XpressLingua</Text>
        <Text style={styles.greeting}>Ready to speak?</Text>

        {/* Hero "Continue" tile with gradient border glow */}
        <LinearGradient
          colors={tokens.brand.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBorder}
        >
          <View style={styles.heroTile}>
            <Text style={styles.heroKicker}>🇨🇳 Mandarin — Survival Deck</Text>
            <Text style={styles.heroTitle}>Continue</Text>
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

        {/* Streak + daily progress tiles */}
        <View style={styles.tileRow}>
          <View style={[styles.tile, styles.squareTile]}>
            <LinearGradient
              colors={tokens.game.streakGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.flameChip}
            >
              <Text style={styles.flameEmoji}>🔥</Text>
            </LinearGradient>
            <Text style={styles.tileStat}>{stats?.streak ?? 0}</Text>
            <Text style={styles.tileLabel}>day streak</Text>
          </View>

          <View style={[styles.tile, styles.squareTile]}>
            <View style={styles.spokenChip}>
              <Text style={styles.flameEmoji}>🗣️</Text>
            </View>
            <Text style={styles.tileStat}>{stats?.totalReviews ?? 0}</Text>
            <Text style={styles.tileLabel}>phrases spoken</Text>
            <View style={styles.tileBarWrap}>
              <GradientBar pct={metPct} height={6} />
              <Text style={styles.tileBarCaption}>
                {stats ? `${stats.learned}/${stats.total} cards met` : ' '}
              </Text>
            </View>
          </View>
        </View>

        {/* Voice warning */}
        {!voiceOk && (
          <View style={styles.warnBanner}>
            <Text style={styles.warnIcon}>⚠️</Text>
            <Text style={styles.warnText}>
              No Mandarin voice found in this browser yet. Chrome or Edge usually has one —
              audio may use a default voice until then.
            </Text>
          </View>
        )}

        {/* Scenarios */}
        <Text style={styles.sectionTitle}>Conversations unlocked</Text>
        {deck.scenarios.map((sc, i) => {
          const p = stats?.perScenario[sc.id];
          const pct = p && p.total > 0 ? Math.round((p.seen / p.total) * 100) : 0;
          return (
            <View key={sc.id} style={[styles.tile, styles.scenarioRow]}>
              <View
                style={[
                  styles.scenarioEmojiWrap,
                  { backgroundColor: SCENARIO_TINTS[i % SCENARIO_TINTS.length] },
                ]}
              >
                <Text style={styles.scenarioEmoji}>{sc.emoji}</Text>
              </View>
              <View style={styles.scenarioBody}>
                <Text style={styles.scenarioTitle}>{sc.title}</Text>
                <GradientBar pct={pct} height={6} />
              </View>
              <Text style={styles.scenarioPct}>{pct}%</Text>
            </View>
          );
        })}

        {/* Upcoming languages */}
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.bg.base },
  content: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 48 },
  headerGlow: { top: -140, alignSelf: 'center' },
  inner: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 12,
  },
  wordmark: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    letterSpacing: 1,
    color: tokens.text.secondary,
    textTransform: 'uppercase',
  },
  greeting: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: tokens.text.primary,
    marginBottom: 6,
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
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: tokens.text.primary,
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
  tileRow: { flexDirection: 'row', gap: 12 },
  tile: {
    backgroundColor: tokens.bg.raised,
    borderRadius: tokens.radius.tile,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    ...shadows.tile,
  },
  squareTile: {
    flex: 1,
    padding: 16,
    gap: 4,
    alignItems: 'flex-start',
  },
  flameChip: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  spokenChip: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: 'rgba(34,211,238,0.14)',
  },
  flameEmoji: { fontSize: 22 },
  tileStat: {
    fontFamily: fonts.stat,
    fontSize: 30,
    color: tokens.text.primary,
  },
  tileLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: tokens.text.secondary,
  },
  tileBarWrap: { width: '100%', gap: 4, marginTop: 8 },
  tileBarCaption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: tokens.text.secondary,
  },
  warnBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: tokens.semantic.warnBg,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    borderRadius: tokens.radius.button,
    padding: 14,
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
  scenarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  scenarioEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scenarioEmoji: { fontSize: 22 },
  scenarioBody: { flex: 1, gap: 7 },
  scenarioTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: tokens.text.primary,
  },
  scenarioPct: {
    fontFamily: fonts.stat,
    fontSize: 15,
    color: tokens.text.secondary,
    width: 44,
    textAlign: 'right',
  },
  upcomingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  upcomingChip: {
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    borderRadius: tokens.radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  upcomingText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: tokens.text.secondary,
  },
});
