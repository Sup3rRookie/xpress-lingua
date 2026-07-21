import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Deck } from '../data/types';
import { zhHsk } from '../data/zh-hsk';
import { deckStats, DeckStats } from '../lib/srs';
import { PickedApkg, pickAndParseApkg } from '../lib/apkgImport';
import { ImportedDeck, listImportedDecks, removeImportedDeck } from '../lib/importedDecks';
import { fonts, shadows, tokens } from '../theme';
import ChunkyButton from '../components/ChunkyButton';
import GradientBar from '../components/GradientBar';
import GlowEllipse from '../components/GlowEllipse';

type ToneMode = 'quiz' | 'pairs' | 'shadow';
type SentencesTab = 'learned' | 'mix';

const EAR_MODES: { mode: ToneMode; emoji: string; label: string }[] = [
  { mode: 'quiz', emoji: '🎵', label: 'Tone Quiz' },
  { mode: 'pairs', emoji: '👂', label: 'Which word?' },
  { mode: 'shadow', emoji: '🗣️', label: 'Repeat after me' },
];

// Practice tab — ear training, sentences, HSK ladder, imported decks.
export default function Practice({
  banner,
  onParsed,
  onStudyImported,
  onStudyDeck,
  onToneTrainer,
  onSentences,
}: {
  banner: string | null;
  onParsed: (picked: PickedApkg) => void;
  onStudyImported: (imported: ImportedDeck) => void;
  onStudyDeck: (d: Deck) => void;
  onToneTrainer: (mode: ToneMode) => void;
  onSentences: (tab: SentencesTab) => void;
}) {
  const [hskStats, setHskStats] = useState<DeckStats | null>(null);
  const [imported, setImported] = useState<ImportedDeck[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    deckStats(zhHsk).then(setHskStats);
    listImportedDecks().then(setImported);
  }, []);

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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <GlowEllipse style={styles.headerGlow} />

      <View style={styles.inner}>
        <Text style={styles.title}>Practice</Text>

        {/* Import success banner */}
        {banner && (
          <View style={styles.successBanner}>
            <Text style={styles.warnIcon}>✅</Text>
            <Text style={styles.successText}>{banner}</Text>
          </View>
        )}

        {/* Ear training */}
        <Text style={styles.sectionTitle}>Ear training</Text>
        <View style={styles.modeRow}>
          {EAR_MODES.map((m) => (
            <Pressable
              key={m.mode}
              style={styles.modeCard}
              onPress={() => onToneTrainer(m.mode)}
              accessibilityRole="button"
              accessibilityLabel={m.label}
              accessibilityHint={`Opens the tone trainer in ${m.label} mode`}
            >
              <Text style={styles.modeEmoji}>{m.emoji}</Text>
              <Text style={styles.modeLabel} numberOfLines={2}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Sentences */}
        <Text style={styles.sectionTitle}>Sentences</Text>
        <View style={styles.modeRow}>
          <Pressable
            style={styles.halfCard}
            onPress={() => onSentences('learned')}
            accessibilityRole="button"
            accessibilityLabel="Learned library"
            accessibilityHint="Opens the sentences you have unlocked"
          >
            <Text style={styles.modeEmoji}>📖</Text>
            <Text style={styles.modeLabel}>Learned library</Text>
          </Pressable>
          <Pressable
            style={styles.halfCard}
            onPress={() => onSentences('mix')}
            accessibilityRole="button"
            accessibilityLabel="Random practice"
            accessibilityHint="Opens sentence practice generated from your words"
          >
            <Text style={styles.modeEmoji}>🎲</Text>
            <Text style={styles.modeLabel}>Random practice</Text>
          </Pressable>
        </View>

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
  modeRow: { flexDirection: 'row', gap: 10 },
  modeCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: tokens.radius.button,
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    ...shadows.tile,
  },
  halfCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: tokens.radius.button,
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    ...shadows.tile,
  },
  modeEmoji: { fontSize: 22 },
  modeLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: tokens.text.secondary,
    textAlign: 'center',
  },
  tile: {
    backgroundColor: tokens.bg.raised,
    borderRadius: tokens.radius.tile,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    ...shadows.tile,
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
  deckMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: tokens.text.secondary,
  },
  warnIcon: { fontSize: 16 },
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
