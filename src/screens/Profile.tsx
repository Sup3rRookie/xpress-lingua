import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { zhSurvival } from '../data/zh-survival';
import { initBuiltinAudio, initVoice } from '../lib/audio';
import { deckStats, DeckStats, PACES, PaceId, setPace } from '../lib/srs';
import { exportBackup, importBackup } from '../lib/backup';
import { fonts, shadows, tokens } from '../theme';
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

// You tab — stats, pace, backup, audio status, upcoming languages.
export default function Profile() {
  const [stats, setStats] = useState<DeckStats | null>(null);
  const [voiceOk, setVoiceOk] = useState(true);
  const [builtinClips, setBuiltinClips] = useState(0);

  const refresh = useCallback(() => {
    deckStats(zhSurvival).then(setStats);
    initVoice(zhSurvival.ttsLocale).then(setVoiceOk);
    initBuiltinAudio(zhSurvival.lang).then(setBuiltinClips);
  }, []);

  useEffect(refresh, [refresh]);

  const changePace = async (id: PaceId) => {
    await setPace(id);
    deckStats(zhSurvival).then(setStats);
  };

  const metPct =
    stats && stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;

  const audioLine =
    builtinClips > 0
      ? `Mandarin voice: ✓ rendered clips (${builtinClips})`
      : voiceOk
        ? 'Mandarin voice: ✓ system voice'
        : 'Mandarin voice: fallback — no Mandarin voice found in this browser, audio may use a default voice.';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <GlowEllipse style={styles.headerGlow} />

      <View style={styles.inner}>
        <Text style={styles.title}>You</Text>

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

        {/* Daily pace */}
        <View style={[styles.tile, styles.paceTile]}>
          <View style={styles.paceHeader}>
            <Text style={styles.paceTitle}>⚡ Daily pace</Text>
            <Text style={styles.paceMeta}>
              {stats ? `${stats.pace.perDay} new cards/day` : ''}
            </Text>
          </View>
          <View style={styles.paceRow}>
            {PACES.map((p) => {
              const active = stats?.pace.id === p.id;
              return (
                <Pressable
                  key={p.id}
                  style={[styles.paceChip, active && styles.paceChipActive]}
                  onPress={() => changePace(p.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.paceChipText, active && styles.paceChipTextActive]}>
                    {p.label}
                  </Text>
                  <Text style={[styles.paceChipCount, active && styles.paceChipTextActive]}>
                    {p.perDay}/day
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {stats?.pace.id === 'beast' && (
            <Text style={styles.paceWarn}>
              🔥 Beast mode: expect 150+ daily reviews within a few weeks — only sustainable
              with a real 60-min/day habit.
            </Text>
          )}
        </View>

        {/* Progress safety */}
        <Text style={styles.sectionTitle}>Progress safety</Text>
        <View style={styles.backupRow}>
          <Pressable
            style={styles.backupBtn}
            onPress={() => exportBackup()}
            accessibilityRole="button"
            accessibilityHint="Downloads a JSON backup of your learning progress"
          >
            <Text style={styles.backupBtnText}>⬇️ Back up progress</Text>
          </Pressable>
          <Pressable
            style={styles.backupBtn}
            onPress={async () => {
              const r = await importBackup();
              if (r === 'ok') refresh();
            }}
            accessibilityRole="button"
            accessibilityHint="Restores progress from a backup file"
          >
            <Text style={styles.backupBtnText}>⬆️ Restore</Text>
          </Pressable>
        </View>
        <Text style={styles.backupHint}>
          Progress lives in this browser — back it up before switching devices or clearing
          browser data.
        </Text>

        {/* Audio */}
        <Text style={styles.sectionTitle}>Audio</Text>
        <View style={[styles.tile, styles.audioTile]}>
          <Text style={styles.audioText}>{audioLine}</Text>
        </View>

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
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 88 },
  headerGlow: { top: -140, alignSelf: 'center' },
  inner: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 12,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: tokens.text.primary,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: tokens.text.primary,
    marginTop: 12,
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
  paceTile: { padding: 14, gap: 10 },
  paceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paceTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: tokens.text.primary,
  },
  paceMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: tokens.text.secondary,
  },
  paceRow: { flexDirection: 'row', gap: 8 },
  paceChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: tokens.bg.elevated,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    gap: 1,
  },
  paceChipActive: {
    backgroundColor: 'rgba(139,92,246,0.22)',
    borderColor: tokens.brand.primary,
  },
  paceChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: tokens.text.secondary,
  },
  paceChipCount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: tokens.text.muted,
  },
  paceChipTextActive: { color: tokens.text.primary },
  paceWarn: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 17,
    color: '#FDE8B0',
  },
  backupRow: { flexDirection: 'row', gap: 10 },
  backupBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: tokens.radius.button,
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  backupBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: tokens.text.primary,
  },
  backupHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 17,
    color: tokens.text.muted,
  },
  audioTile: { padding: 14 },
  audioText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: tokens.text.secondary,
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
