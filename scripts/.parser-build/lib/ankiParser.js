"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMPORT_NOTE_CAP = exports.SAMPLE_NOTES = exports.APKG_ERROR_MESSAGES = exports.ApkgError = void 0;
exports.extractSounds = extractSounds;
exports.isAudioFilename = isAudioFilename;
exports.cleanText = cleanText;
exports.parseApkg = parseApkg;
exports.guessMapping = guessMapping;
exports.buildDeckItems = buildDeckItems;
// Anki .apkg parsing — platform-agnostic (no React Native imports).
// Runs in the browser (sql.js WASM) and in Node (scripts/test-import.js).
//
// .apkg layout: a ZIP holding collection.anki21 (SQLite, schema 11, preferred)
// or collection.anki2 (legacy), a "media" JSON file mapping "number" -> original
// filename, and the media files themselves stored under those numeric names.
// collection.anki21b (zstd-compressed, newest format) is detected but not supported.
const fflate_1 = require("fflate");
class ApkgError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'ApkgError';
    }
}
exports.ApkgError = ApkgError;
exports.APKG_ERROR_MESSAGES = {
    'not-zip': "This doesn't look like an Anki .apkg export.",
    'no-collection': "This doesn't look like an Anki .apkg export.",
    anki21b: "This deck uses Anki's newest format. In Anki: File → Export → check 'Support older Anki versions', then import again.",
    'sql-failed': "Couldn't read this deck (unsupported Anki version).",
    'zero-notes': 'This deck contains no notes — nothing to import.',
};
const FIELD_SEP = '\x1f';
exports.SAMPLE_NOTES = 200; // notes scanned for samples / sound detection
const FIELD_CAP = 300; // max chars kept per cleaned field
const AUDIO_EXTS = ['.mp3', '.ogg', '.wav', '.m4a', '.opus'];
// ---------------------------------------------------------------------------
// Text cleanup
// ---------------------------------------------------------------------------
const ENTITIES = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
};
/** Extract [sound:xyz.mp3] filenames from a raw field value. */
function extractSounds(raw) {
    const out = [];
    const re = /\[sound:([^\]]+)\]/g;
    let m;
    while ((m = re.exec(raw)))
        out.push(m[1].trim());
    return out;
}
function isAudioFilename(filename) {
    const lower = filename.toLowerCase();
    return AUDIO_EXTS.some((ext) => lower.endsWith(ext));
}
/** Strip [sound:] tags, unwrap cloze markup, strip HTML, decode entities. */
function cleanText(raw) {
    let s = raw;
    s = s.replace(/\[sound:[^\]]*\]/g, ' ');
    // {{c1::text}} or {{c1::text::hint}} -> text
    s = s.replace(/\{\{c\d+::([^:}]*(?:::[^}]*)?)\}\}/g, (_full, inner) => {
        const idx = inner.indexOf('::');
        return idx >= 0 ? inner.slice(0, idx) : inner;
    });
    s = s.replace(/<br\s*\/?>/gi, ' ').replace(/<\/(?:div|p|li|tr)>/gi, ' ');
    s = s.replace(/<[^>]*>/g, '');
    s = s.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (e) => ENTITIES[e] ?? e);
    s = s.replace(/&#(\d+);/g, (_e, code) => String.fromCodePoint(Number(code)));
    s = s.replace(/\s+/g, ' ').trim();
    return s.length > FIELD_CAP ? s.slice(0, FIELD_CAP).trim() : s;
}
// ---------------------------------------------------------------------------
// Archive + SQLite parsing
// ---------------------------------------------------------------------------
function unzipEntries(data, wanted) {
    try {
        return (0, fflate_1.unzipSync)(data, { filter: (f) => wanted(f.name) });
    }
    catch {
        throw new ApkgError('not-zip', exports.APKG_ERROR_MESSAGES['not-zip']);
    }
}
function parseApkg(data, SQL) {
    const core = unzipEntries(data, (n) => n === 'media' ||
        n === 'collection.anki21' ||
        n === 'collection.anki2' ||
        n === 'collection.anki21b');
    const hasNewFormat = !!core['collection.anki21b'];
    const dbBytes = core['collection.anki21'] ?? core['collection.anki2'];
    if (!dbBytes) {
        if (hasNewFormat)
            throw new ApkgError('anki21b', exports.APKG_ERROR_MESSAGES.anki21b);
        throw new ApkgError('no-collection', exports.APKG_ERROR_MESSAGES['no-collection']);
    }
    let models;
    let rawNotes;
    try {
        const db = new SQL.Database(dbBytes);
        try {
            const colRes = db.exec('SELECT models FROM col LIMIT 1');
            models = JSON.parse(String(colRes[0]?.values[0]?.[0] ?? '{}'));
            rawNotes = [];
            const stmt = db.prepare('SELECT mid, flds FROM notes');
            while (stmt.step()) {
                const row = stmt.get();
                rawNotes.push({ mid: String(row[0]), flds: String(row[1] ?? '') });
            }
            stmt.free();
        }
        finally {
            db.close();
        }
    }
    catch {
        throw new ApkgError('sql-failed', exports.APKG_ERROR_MESSAGES['sql-failed']);
    }
    if (rawNotes.length === 0) {
        // A stub collection next to an .anki21b still means "new format".
        if (hasNewFormat)
            throw new ApkgError('anki21b', exports.APKG_ERROR_MESSAGES.anki21b);
        throw new ApkgError('zero-notes', exports.APKG_ERROR_MESSAGES['zero-notes']);
    }
    // Group notes by model id; keep the note type with the most notes.
    const byMid = new Map();
    for (const n of rawNotes) {
        const list = byMid.get(n.mid) ?? [];
        list.push(n.flds.split(FIELD_SEP));
        byMid.set(n.mid, list);
    }
    let chosenMid = '';
    for (const [mid, list] of byMid) {
        if (!chosenMid || list.length > (byMid.get(chosenMid)?.length ?? 0))
            chosenMid = mid;
    }
    const notes = byMid.get(chosenMid);
    const chosenModel = models[chosenMid];
    const noteTypeName = chosenModel?.name || 'Unknown note type';
    const skippedNoteTypes = [...byMid.entries()]
        .filter(([mid]) => mid !== chosenMid)
        .map(([mid, list]) => ({ name: models[mid]?.name || 'Unknown note type', count: list.length }));
    // Field metadata (names from the model, ordered by ord; pad to widest note).
    const modelFields = (chosenModel?.flds ?? [])
        .slice()
        .sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0))
        .map((f, i) => f.name || `Field ${i + 1}`);
    const width = Math.max(modelFields.length, ...notes.map((n) => n.length));
    const fields = [];
    for (let i = 0; i < width; i++) {
        const info = { name: modelFields[i] ?? `Field ${i + 1}`, index: i, samples: [], soundCount: 0 };
        for (const note of notes.slice(0, exports.SAMPLE_NOTES)) {
            const raw = note[i] ?? '';
            if (extractSounds(raw).length > 0)
                info.soundCount += 1;
            if (info.samples.length < 3) {
                const cleaned = cleanText(raw);
                if (cleaned)
                    info.samples.push(cleaned.length > 40 ? `${cleaned.slice(0, 40)}…` : cleaned);
            }
        }
        fields.push(info);
    }
    // "media" maps zip entry name -> original filename; invert for lookup.
    let mediaJson = {};
    if (core['media']) {
        try {
            mediaJson = JSON.parse(new TextDecoder().decode(core['media']));
        }
        catch {
            mediaJson = {};
        }
    }
    const entryByFilename = new Map();
    for (const [entry, filename] of Object.entries(mediaJson))
        entryByFilename.set(filename, entry);
    return {
        noteTypeName,
        skippedNoteTypes,
        fields,
        notes,
        totalNotes: notes.length,
        mediaFilenames: [...entryByFilename.keys()],
        readMedia(filename) {
            const entry = entryByFilename.get(filename);
            if (!entry)
                return null;
            const got = unzipEntries(data, (n) => n === entry);
            return got[entry] ?? null;
        },
    };
}
const PHRASE_HINTS = ['hanzi', 'simplified', 'traditional', 'character', 'expression', 'front'];
const PRON_HINTS = ['pinyin', 'reading', 'pronunciation', 'romaji', 'furigana'];
const MEANING_HINTS = ['english', 'meaning', 'translation', 'back', 'definition'];
const AUDIO_HINTS = ['audio', 'sound'];
function matchHint(fields, hints, taken) {
    for (const hint of hints) {
        for (const f of fields) {
            if (!taken.has(f.index) && f.name.toLowerCase().includes(hint))
                return f.index;
        }
    }
    return null;
}
/**
 * Heuristic default mapping from field names + detected [sound:] tags.
 * `sampledNotes` = how many notes the FieldInfo stats were computed over
 * (min(totalNotes, 200)); a field only counts as the audio field by sound
 * tags alone when the majority of sampled notes carry one — a text field
 * with the odd embedded [sound:] shouldn't steal the slot.
 */
function guessMapping(fields, sampledNotes) {
    const taken = new Set();
    const threshold = Math.max(1, Math.ceil((sampledNotes ?? exports.SAMPLE_NOTES) / 2));
    // Audio first: prefer the field where [sound:] tags actually live.
    let audio = null;
    let bestSound = 0;
    for (const f of fields) {
        if (f.soundCount >= threshold && f.soundCount > bestSound) {
            bestSound = f.soundCount;
            audio = f.index;
        }
    }
    if (audio === null)
        audio = matchHint(fields, AUDIO_HINTS, taken);
    if (audio !== null)
        taken.add(audio);
    let phrase = matchHint(fields, PHRASE_HINTS, taken);
    if (phrase !== null)
        taken.add(phrase);
    const pronunciation = matchHint(fields, PRON_HINTS, taken);
    if (pronunciation !== null)
        taken.add(pronunciation);
    const meaning = matchHint(fields, MEANING_HINTS, taken);
    if (meaning !== null)
        taken.add(meaning);
    if (phrase === null) {
        // Fall back to the first field not claimed by another target.
        phrase = fields.find((f) => !taken.has(f.index))?.index ?? 0;
    }
    return { phrase, pronunciation, meaning, audio };
}
// ---------------------------------------------------------------------------
// Deck building
// ---------------------------------------------------------------------------
exports.IMPORT_NOTE_CAP = 1000;
function buildDeckItems(parsed, mapping, deckId, cap = exports.IMPORT_NOTE_CAP) {
    const available = new Set(parsed.mediaFilenames);
    const items = [];
    const audio = [];
    const seenAudio = new Set();
    for (const note of parsed.notes) {
        if (items.length >= cap)
            break;
        const phrase = cleanText(note[mapping.phrase] ?? '');
        if (!phrase)
            continue; // nothing to say aloud — skip
        const pinyin = mapping.pronunciation !== null ? cleanText(note[mapping.pronunciation] ?? '') : '';
        const meaning = mapping.meaning !== null ? cleanText(note[mapping.meaning] ?? '') : '';
        const item = {
            id: `${deckId}-n${items.length}`,
            scenario: 'imported',
            type: 'chunk',
            hanzi: phrase,
            pinyin,
            gloss: meaning || pinyin || phrase,
        };
        if (mapping.audio !== null) {
            const sound = extractSounds(note[mapping.audio] ?? '').find((f) => isAudioFilename(f) && available.has(f));
            if (sound) {
                item.audioKey = `${deckId}/${sound}`;
                if (!seenAudio.has(sound)) {
                    seenAudio.add(sound);
                    audio.push({ filename: sound, audioKey: item.audioKey });
                }
            }
        }
        items.push(item);
    }
    return {
        items,
        audio,
        importedCount: items.length,
        totalNotes: parsed.totalNotes,
        capped: parsed.totalNotes > items.length && items.length >= cap,
    };
}
