import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Deck } from '../data/types';
import { zhHsk } from '../data/zh-hsk';
import { initBuiltinAudio, initVoice } from '../lib/audio';
import { deckStats, DeckStats, PACES, PaceId, setPace } from '../lib/srs';
import { unlockedSentences } from '../lib/sentences';
import { PickedApkg, pickAndParseApkg } from '../lib/apkgImport';
import { ImportedDeck, listImportedDecks, removeImportedDeck } from '../lib/importedDecks';
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

export default function Home({
  deck,
  onStart,
  onStudyImported,
  onStudyDeck,
  onParsed,
  onSentences,
  banner,
}: {
  deck: Deck;
  onStart: () => void;
  onStudyImported: (imported: ImportedDeck) => void;
  onStudyDeck: (d: Deck) => void;
  onParsed: (picked: PickedApkg) => void;
  onSentences: () => void;
  banner: string | null;
}) {
  const [stats, setStats] = useState<DeckStats | null>(null);
  const [hskStats, setHskStats] = useState<DeckStats | null>(null);
  const [voiceOk, setVoiceOk] = useState(true);
  const [builtinClips, setBuiltinClips] = useState(0);
  const [imported, setImported] = useState<ImportedDeck[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    deckStats(deck).then(setStats);
    deckStats(zhHsk).then(setHskStats);
    initVoice(deck.ttsLocale).then(setVoiceOk);
    initBuiltinAudio(deck.lang).then(setBuiltinClips);
    listImportedDecks().then(setImported);
  }, [deck]);

  useEffect(refresh, [refresh]);

  const pickDeck = async () => {
    if (parsing) return;
    setImportError(null);
    setParsing(true);
    const res = await pickAndParseApkg();
    setParsing(false);
    if (res.status === 'ok') onParsed(res.picked);
    else if (res.status === 'error') setImportError(res.message);
  };

  const confirmRemove = async (id: string) => {
    setRemovingId(null);
    await removeImportedDeck(id);
    listImportedDecks().then(setImported);
  };

  const changePace = async (id: PaceId) => {
    await setPace(id);
    deckStats(deck).then(setStats);
  };

  const toStudy = stats ? stats.dueCount + stats.freshAvailable : 0;
  const metPct =
    stats && stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;
  const sentenceCount = stats ? unlockedSentences(stats.metIds).length : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <GlowEllipse style={styles.headerGlow} />

      <View style={styles.inner}>
        {/* Header */}
        <Text style={styles.wordmark}>⚡ XpressLingua</Text>
        <Text style={styles.greeting}>Ready to speak?</Text>

        {/* Import success banner */}
        {banner && (
          <View style={styles.successBanner}>
            <Text style={styles.warnIcon}>✅</Text>
            <Text style={styles.successText}>{banner}</Text>
          </View>
        )}

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

        {/* Voice warning — moot once pre-rendered clips exist */}
        {!voiceOk && builtinClips === 0 && (
          <View style={styles.warnBanner}>
            <Text style={styles.warnIcon}>⚠️</Text>
            <Text style={styles.warnText}>
              No Mandarin voice found in this browser yet. Chrome or Edge usually has one —
              audio may use a default voice until then.
            </Text>
          </View>
        )}

        {/* Scenarios — sequential unlock: finish one to open the next */}
        <Text style={styles.sectionTitle}>Conversations unlocked</Text>
        {deck.scenarios.map((sc, i) => {
          const p = stats?.perScenario[sc.id];
          const pct = p && p.total > 0 ? Math.round((p.seen / p.total) * 100) : 0;
          const locked = p ? !p.unlocked : i > 0;
          const prevTitle = i > 0 ? deck.scenarios[i - 1].title : '';
          return (
            <View
              key={sc.id}
              style={[styles.tile, styles.scenarioRow, locked && styles.scenarioLocked]}
            >
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
              <View style={styles.scenarioBody}>
                <Text style={[styles.scenarioTitle, locked && styles.scenarioTitleLocked]}>
                  {sc.title}
                </Text>
                {locked ? (
                  <Text style={styles.scenarioLockHint}>
                    Complete {prevTitle} to unlock
                  </Text>
                ) : (
                  <GradientBar pct={pct} height={6} />
                )}
              </View>
              {!locked && <Text style={styles.scenarioPct}>{pct}%</Text>}
            </View>
          );
        })}

        {/* Sentences */}
        <Text style={styles.sectionTitle}>Words in action</Text>
        <Pressable
          style={[styles.tile, styles.scenarioRow]}
          onPress={onSentences}
          accessibilityRole="button"
          accessibilityHint="Opens your sentence library and the sentence generator"
        >
          <View style={[styles.scenarioEmojiWrap, { backgroundColor: 'rgba(139,92,246,0.16)' }]}>
            <Text style={styles.scenarioEmoji}>📖</Text>
          </View>
          <View style={styles.scenarioBody}>
            <Text style={styles.scenarioTitle}>Sentences</Text>
            <Text style={styles.deckMeta}>
              {sentenceCount} unlocked · plus random practice from your words
            </Text>
          </View>
          <Text style={styles.sentencesChevron}>›</Text>
        </Pressable>

        {/* HSK ladder deck */}
        <Text style={styles.sectionTitle}>Level up</Text>
        <View style={[styles.tile, styles.scenarioRow]}>
          <View style={[styles.scenarioEmojiWrap, { backgroundColor: 'rgba(255,201,74,0.14)' }]}>
            <Text style={styles.scenarioEmoji}>🀄</Text>
          </View>
          <View style={styles.scenarioBody}>
            <Text style={styles.scenarioTitle}>HSK Ladder (1–4)</Text>
            <Text style={styles.deckMeta}>
              {hskStats
                ? `${hskStats.learned}/${hskStats.total} words · ${
                    hskStats.dueCount + hskStats.freshAvailable
                  } ready today`
                : 'loading…'}
            </Text>
            <GradientBar
              pct={hskStats && hskStats.total > 0 ? Math.round((hskStats.learned / hskStats.total) * 100) : 0}
              height={6}
            />
          </View>
          <Pressable
            style={[styles.deckActionBtn, styles.studyBtn]}
            onPress={() => onStudyDeck(zhHsk)}
            accessibilityRole="button"
            accessibilityHint="Starts a speaking session with the HSK ladder deck"
          >
            <Text style={styles.studyBtnText}>▶ Study</Text>
          </Pressable>
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

        {/* Imported decks */}
        <Text style={styles.sectionTitle}>Your decks</Text>
        {imported.length === 0 && (
          <Text style={styles.emptyDecksText}>
            No imported decks yet — bring your own Anki deck below.
          </Text>
        )}
        {imported.map((d) => (
          <View key={d.id} style={[styles.tile, styles.deckRow]}>
            <View style={styles.deckEmojiWrap}>
              <Text style={styles.scenarioEmoji}>📥</Text>
            </View>
            <View style={styles.deckBody}>
              <Text style={styles.scenarioTitle} numberOfLines={1}>
                {d.name}
              </Text>
              <Text style={styles.deckMeta}>
                {d.itemCount} cards · {d.deck.langLabel}
              </Text>
            </View>
            {removingId === d.id ? (
              <View style={styles.deckActions}>
                <Text style={styles.removeAsk}>Remove?</Text>
                <Pressable
                  style={[styles.deckActionBtn, styles.removeYesBtn]}
                  onPress={() => confirmRemove(d.id)}
                  accessibilityRole="button"
                >
                  <Text style={styles.removeYesText}>Yes</Text>
                </Pressable>
                <Pressable
                  style={styles.deckActionBtn}
                  onPress={() => setRemovingId(null)}
                  accessibilityRole="button"
                >
                  <Text style={styles.deckActionText}>Keep</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.deckActions}>
                <Pressable
                  style={[styles.deckActionBtn, styles.studyBtn]}
                  onPress={() => onStudyImported(d)}
                  accessibilityRole="button"
                  accessibilityHint={`Starts a speaking session with ${d.name}`}
                >
                  <Text style={styles.studyBtnText}>▶ Study</Text>
                </Pressable>
                <Pressable
                  style={styles.deckActionBtn}
                  onPress={() => setRemovingId(d.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${d.name}`}
                >
                  <Text style={styles.deckActionText}>✕</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}

        {/* Import error banner */}
        {importError && (
          <View style={styles.errorBanner}>
            <Text style={styles.warnIcon}>⚠️</Text>
            <Text style={styles.errorText}>{importError}</Text>
          </View>
        )}

        <ChunkyButton
          label={parsing ? 'Reading deck…' : 'Import Anki deck (.apkg)'}
          face={tokens.bg.elevated}
          edge="#141031"
          textColor={tokens.text.primary}
          disabled={parsing}
          onPress={pickDeck}
          accessibilityHint="Opens a file picker for an Anki .apkg export"
        />
        {parsing && (
          <Text style={styles.parsingText}>Unpacking and reading the deck — big files can take a moment…</Text>
        )}
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
  scenarioLocked: { opacity: 0.75 },
  scenarioEmojiLocked: { fontSize: 18 },
  scenarioTitleLocked: { color: tokens.text.secondary },
  scenarioLockHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: tokens.text.muted,
  },
  sentencesChevron: {
    fontFamily: fonts.bodyBold,
    fontSize: 26,
    color: tokens.text.secondary,
    paddingRight: 4,
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
  successBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: tokens.semantic.successBg,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
    borderRadius: tokens.radius.button,
    padding: 14,
    alignItems: 'flex-start',
  },
  successText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: '#C9F5E3',
  },
  errorBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: tokens.semantic.dangerBg,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.3)',
    borderRadius: tokens.radius.button,
    padding: 14,
    alignItems: 'flex-start',
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: '#FECDD5',
  },
  emptyDecksText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: tokens.text.secondary,
  },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  deckEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,211,238,0.14)',
  },
  deckBody: { flex: 1, gap: 2 },
  deckMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: tokens.text.secondary,
  },
  deckActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deckActionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.elevated,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  deckActionText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: tokens.text.secondary,
  },
  studyBtn: {
    borderColor: 'rgba(34,211,238,0.4)',
    backgroundColor: 'rgba(34,211,238,0.14)',
  },
  studyBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: tokens.brand.cyan,
  },
  removeAsk: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: tokens.semantic.danger,
  },
  removeYesBtn: {
    borderColor: 'rgba(251,113,133,0.4)',
    backgroundColor: tokens.semantic.dangerBg,
  },
  removeYesText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: tokens.semantic.danger,
  },
  parsingText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: tokens.text.secondary,
    textAlign: 'center',
  },
});
