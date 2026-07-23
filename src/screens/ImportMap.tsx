import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  FieldInfo,
  FieldMapping,
  guessMapping,
  ParsedApkg,
  SAMPLE_NOTES,
} from '../lib/ankiParser';
import {
  finalizeImport,
  guessLang,
  ImportResult,
  LANG_OPTIONS,
  LangOption,
  PickedApkg,
} from '../lib/apkgImport';
import { fonts, shadows, tokens } from '../theme';
import ChunkyButton from '../components/ChunkyButton';
import GlowEllipse from '../components/GlowEllipse';

type TargetKey = keyof FieldMapping;

const TARGETS: { key: TargetKey; label: string; required: boolean; hint: string }[] = [
  { key: 'phrase', label: 'Target phrase', required: true, hint: 'what you will say out loud' },
  { key: 'pronunciation', label: 'Pronunciation / reading', required: false, hint: 'pinyin, romaji…' },
  { key: 'meaning', label: 'Meaning / translation', required: false, hint: 'shown on the card front' },
  { key: 'audio', label: 'Audio', required: false, hint: 'auto-detected from [sound:] tags' },
];

function FieldSelect({
  target,
  fields,
  value,
  onChange,
}: {
  target: (typeof TARGETS)[number];
  fields: FieldInfo[];
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value !== null ? fields[value] : null;

  return (
    <View style={styles.selectTile}>
      <Pressable
        style={styles.selectHeader}
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={`${target.label}: ${selected ? selected.name : 'none'}`}
      >
        <View style={styles.selectHeaderText}>
          <Text style={styles.selectLabel}>
            {target.label}
            {target.required ? <Text style={styles.requiredStar}> *</Text> : null}
          </Text>
          <Text style={styles.selectHint}>{target.hint}</Text>
        </View>
        <View style={styles.selectValuePill}>
          <Text style={styles.selectValueText} numberOfLines={1}>
            {selected ? selected.name : '(none)'}
          </Text>
          <Text style={styles.selectCaret}>{open ? '▴' : '▾'}</Text>
        </View>
      </Pressable>

      {open && (
        <View style={styles.optionList}>
          {!target.required && (
            <Pressable
              style={[styles.option, value === null && styles.optionActive]}
              onPress={() => {
                onChange(null);
                setOpen(false);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.optionName}>None</Text>
            </Pressable>
          )}
          {fields.map((f) => (
            <Pressable
              key={f.index}
              style={[styles.option, value === f.index && styles.optionActive]}
              onPress={() => {
                onChange(f.index);
                setOpen(false);
              }}
              accessibilityRole="button"
            >
              <View style={styles.optionNameRow}>
                <Text style={styles.optionName}>{f.name}</Text>
                {f.soundCount > 0 && (
                  <Text style={styles.soundBadge}>🔊 {f.soundCount} sound</Text>
                )}
              </View>
              {f.samples.length > 0 && (
                <Text style={styles.optionSamples} numberOfLines={2}>
                  {f.samples.join('  ·  ')}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ImportMap({
  picked,
  onCancel,
  onDone,
}: {
  picked: PickedApkg;
  onCancel: () => void;
  onDone: (result: ImportResult) => void;
}) {
  const parsed: ParsedApkg = picked.parsed;
  const [mapping, setMapping] = useState<FieldMapping>(() =>
    guessMapping(parsed.fields, Math.min(parsed.totalNotes, SAMPLE_NOTES)),
  );
  const [lang, setLang] = useState<LangOption>(() => guessLang(parsed));
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const skippedNote = useMemo(() => {
    if (parsed.skippedNoteTypes.length === 0) return null;
    const parts = parsed.skippedNoteTypes.map((t) => `${t.name} (${t.count})`);
    return `Other note types skipped: ${parts.join(', ')}`;
  }, [parsed.skippedNoteTypes]);

  const setTarget = (key: TargetKey, v: number | null) => {
    setMapping((m) => ({ ...m, [key]: v }));
  };

  const importNow = async () => {
    if (progress) return;
    setError(null);
    setProgress('Importing…');
    try {
      const result = await finalizeImport(picked, mapping, lang, setProgress);
      onDone(result);
    } catch {
      setProgress(null);
      setError("Couldn't finish the import, nothing was saved. Try again?");
    }
  };

  const importCount = Math.min(parsed.totalNotes, 1000);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <GlowEllipse style={styles.headerGlow} />

      <View style={styles.inner}>
        <View style={styles.topBar}>
          <Pressable onPress={onCancel} style={styles.endBtn} accessibilityRole="button">
            <Text style={styles.endBtnText}>✕ Cancel</Text>
          </Pressable>
        </View>

        <Text style={styles.kicker}>📥 Import Anki deck</Text>
        <Text style={styles.title} numberOfLines={2}>
          {picked.fileName}
        </Text>

        {/* Deck summary */}
        <View style={styles.summaryTile}>
          <Text style={styles.summaryLine}>
            Note type: <Text style={styles.summaryStrong}>{parsed.noteTypeName}</Text> ·{' '}
            <Text style={styles.summaryStrong}>{parsed.totalNotes}</Text> notes
          </Text>
          {parsed.totalNotes > 1000 && (
            <Text style={styles.summaryWarn}>
              Large deck, the first 1000 of {parsed.totalNotes} notes will be imported.
            </Text>
          )}
          {skippedNote && <Text style={styles.summaryMuted}>{skippedNote}</Text>}
        </View>

        {/* Field mapping */}
        <Text style={styles.sectionTitle}>Match the fields</Text>
        {TARGETS.map((t) => (
          <FieldSelect
            key={t.key}
            target={t}
            fields={parsed.fields}
            value={mapping[t.key]}
            onChange={(v) => setTarget(t.key, v)}
          />
        ))}

        {/* Language */}
        <Text style={styles.sectionTitle}>Deck language</Text>
        <Text style={styles.sectionCaption}>Picks the voice used for speaking practice.</Text>
        <View style={styles.langRow}>
          {LANG_OPTIONS.map((l) => (
            <Pressable
              key={l.key}
              style={[styles.langChip, lang.key === l.key && styles.langChipActive]}
              onPress={() => setLang(l)}
              accessibilityRole="button"
              accessibilityState={{ selected: lang.key === l.key }}
            >
              <Text
                style={[styles.langChipText, lang.key === l.key && styles.langChipTextActive]}
              >
                {l.emoji} {l.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.ctaWrap}>
          <ChunkyButton
            label={progress ?? `Import ${importCount} cards`}
            gradient={tokens.brand.gradient}
            edge={tokens.brand.primaryDown}
            textColor={tokens.text.onCard}
            disabled={!!progress}
            onPress={importNow}
            accessibilityHint="Imports the deck with the chosen field mapping"
          />
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
  topBar: { flexDirection: 'row' },
  endBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  endBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: tokens.text.secondary },
  kicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    letterSpacing: 1,
    color: tokens.text.secondary,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: tokens.text.primary,
  },
  summaryTile: {
    backgroundColor: tokens.bg.raised,
    borderRadius: tokens.radius.tile,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    padding: 14,
    gap: 6,
    ...shadows.tile,
  },
  summaryLine: { fontFamily: fonts.bodyMedium, fontSize: 14, color: tokens.text.secondary },
  summaryStrong: { fontFamily: fonts.bodyBold, color: tokens.text.primary },
  summaryWarn: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#FDE8B0' },
  summaryMuted: { fontFamily: fonts.bodyMedium, fontSize: 13, color: tokens.text.secondary },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: tokens.text.primary,
    marginTop: 12,
  },
  sectionCaption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: tokens.text.secondary,
    marginTop: -8,
  },
  selectTile: {
    backgroundColor: tokens.bg.raised,
    borderRadius: tokens.radius.tile,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    ...shadows.tile,
  },
  selectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  selectHeaderText: { flex: 1, gap: 2 },
  selectLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: tokens.text.primary },
  requiredStar: { color: tokens.brand.cyan },
  selectHint: { fontFamily: fonts.bodyMedium, fontSize: 12, color: tokens.text.secondary },
  selectValuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 180,
    backgroundColor: tokens.bg.elevated,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    borderRadius: tokens.radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  selectValueText: {
    flexShrink: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: tokens.brand.cyan,
  },
  selectCaret: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: tokens.text.secondary },
  optionList: {
    borderTopWidth: 1,
    borderTopColor: tokens.border.subtle,
    paddingVertical: 4,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 3,
  },
  optionActive: { backgroundColor: 'rgba(139,92,246,0.16)' },
  optionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: tokens.text.primary },
  soundBadge: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: tokens.brand.cyan,
    backgroundColor: 'rgba(34,211,238,0.14)',
    borderRadius: tokens.radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  optionSamples: { fontFamily: fonts.bodyMedium, fontSize: 12, color: tokens.text.secondary },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langChip: {
    backgroundColor: tokens.bg.raised,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    borderRadius: tokens.radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  langChipActive: {
    borderColor: tokens.brand.primary,
    backgroundColor: 'rgba(139,92,246,0.16)',
  },
  langChipText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: tokens.text.secondary },
  langChipTextActive: { color: tokens.text.primary },
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
  errorIcon: { fontSize: 16 },
  errorText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: '#FECDD5',
  },
  ctaWrap: { marginTop: 8 },
});
