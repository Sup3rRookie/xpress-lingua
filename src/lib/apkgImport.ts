import * as DocumentPicker from 'expo-document-picker';
import { Deck } from '../data/types';
import {
  ApkgError,
  APKG_ERROR_MESSAGES,
  buildDeckItems,
  FieldMapping,
  ParsedApkg,
  parseApkg,
} from './ankiParser';
import { newDeckId, saveImportedDeck } from './importedDecks';
import { mimeForFilename, putAudio } from './mediaStore';
import { loadSql } from './sqljs';

export interface PickedApkg {
  fileName: string;
  parsed: ParsedApkg;
}

export type PickResult =
  | { status: 'ok'; picked: PickedApkg }
  | { status: 'canceled' }
  | { status: 'error'; message: string };

/** Open the file picker (an <input type=file> on web), unzip and parse the .apkg. */
export async function pickAndParseApkg(): Promise<PickResult> {
  let res: DocumentPicker.DocumentPickerResult;
  try {
    res = await DocumentPicker.getDocumentAsync({
      type: ['.apkg', '.zip', 'application/zip', 'application/octet-stream'],
      multiple: false,
      copyToCacheDirectory: false,
    });
  } catch {
    return { status: 'error', message: "Couldn't open the file picker in this browser." };
  }
  if (res.canceled || !res.assets?.[0]) return { status: 'canceled' };

  const asset = res.assets[0];
  const lowerName = asset.name.toLowerCase();
  if (!lowerName.endsWith('.apkg') && !lowerName.endsWith('.zip')) {
    return { status: 'error', message: 'Please pick a .apkg (or .zip) Anki export.' };
  }

  try {
    let bytes: Uint8Array;
    if (asset.file) {
      bytes = new Uint8Array(await asset.file.arrayBuffer());
    } else {
      const fetched = await fetch(asset.uri);
      bytes = new Uint8Array(await fetched.arrayBuffer());
    }
    const SQL = await loadSql();
    const parsed = parseApkg(bytes, SQL);
    return { status: 'ok', picked: { fileName: asset.name, parsed } };
  } catch (e) {
    if (e instanceof ApkgError) return { status: 'error', message: e.message };
    return { status: 'error', message: APKG_ERROR_MESSAGES['sql-failed'] };
  }
}

export interface LangOption {
  key: string;
  label: string;
  emoji: string;
  lang: string;
  ttsLocale: string;
}

export const LANG_OPTIONS: LangOption[] = [
  { key: 'zh', label: 'Mandarin', emoji: '🇨🇳', lang: 'zh', ttsLocale: 'zh-CN' },
  { key: 'ja', label: 'Japanese', emoji: '🇯🇵', lang: 'ja', ttsLocale: 'ja-JP' },
  { key: 'ko', label: 'Korean', emoji: '🇰🇷', lang: 'ko', ttsLocale: 'ko-KR' },
  { key: 'es', label: 'Spanish', emoji: '🇪🇸', lang: 'es', ttsLocale: 'es-ES' },
  { key: 'fr', label: 'French', emoji: '🇫🇷', lang: 'fr', ttsLocale: 'fr-FR' },
  { key: 'ar-eg', label: 'Arabic (Egyptian)', emoji: '🇪🇬', lang: 'ar', ttsLocale: 'ar-EG' },
  { key: 'ar-lb', label: 'Arabic (Levantine)', emoji: '🇱🇧', lang: 'ar', ttsLocale: 'ar-LB' },
  { key: 'other', label: 'Other', emoji: '🌍', lang: 'other', ttsLocale: 'en-US' },
];

/** Field-name based guess so Mandarin/Japanese decks land on the right voice. */
export function guessLang(parsed: ParsedApkg): LangOption {
  const names = parsed.fields.map((f) => f.name.toLowerCase()).join(' ');
  if (/hanzi|pinyin|simplified|traditional|mandarin|chinese/.test(names)) return LANG_OPTIONS[0];
  if (/kanji|romaji|furigana|kana|japanese/.test(names)) return LANG_OPTIONS[1];
  if (/hangul|korean/.test(names)) return LANG_OPTIONS[2];
  return LANG_OPTIONS[0];
}

export interface ImportResult {
  deckId: string;
  deckName: string;
  importedCount: number;
  totalNotes: number;
  capped: boolean;
  audioStored: number;
}

/** Build the deck from the confirmed mapping, stash audio blobs, persist the deck. */
export async function finalizeImport(
  picked: PickedApkg,
  mapping: FieldMapping,
  lang: LangOption,
  onProgress?: (text: string) => void,
): Promise<ImportResult> {
  const deckId = newDeckId();
  const deckName = picked.fileName.replace(/\.(apkg|zip)$/i, '');
  onProgress?.('Building cards…');
  const built = buildDeckItems(picked.parsed, mapping, deckId);

  let audioStored = 0;
  for (let i = 0; i < built.audio.length; i++) {
    const a = built.audio[i];
    onProgress?.(`Saving audio ${i + 1} / ${built.audio.length}…`);
    const bytes = picked.parsed.readMedia(a.filename);
    if (!bytes) continue;
    try {
      // Copy into a plain ArrayBuffer so the Blob ctor accepts it under strict TS.
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      await putAudio(a.audioKey, new Blob([copy.buffer], { type: mimeForFilename(a.filename) }));
      audioStored += 1;
    } catch {
      // blob store unavailable, the session falls back to TTS for this card
    }
  }

  const deck: Deck = {
    lang: lang.lang,
    langLabel: lang.label,
    ttsLocale: lang.ttsLocale,
    scenarios: [{ id: 'imported', title: deckName, emoji: '📥' }],
    items: built.items,
  };

  onProgress?.('Saving deck…');
  await saveImportedDeck({
    id: deckId,
    name: deckName,
    importedAt: new Date().toISOString(),
    itemCount: built.items.length,
    sourceNoteType: picked.parsed.noteTypeName,
    deck,
  });

  return {
    deckId,
    deckName,
    importedCount: built.importedCount,
    totalNotes: built.totalNotes,
    capped: built.capped,
    audioStored,
  };
}
