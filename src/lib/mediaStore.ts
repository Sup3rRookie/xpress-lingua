import { Platform } from 'react-native';
import { registerPlayback, stopPlayback } from './audio';

// Imported-deck audio blobs live in IndexedDB (web). Native is a no-op for now -
// imports are web-first; native sessions fall back to TTS.
// db 'xl-media', object store 'audio', key `${deckId}/${filename}`, value Blob.

const DB_NAME = 'xl-media';
const STORE = 'audio';

const idbSupported = () =>
  Platform.OS === 'web' && typeof indexedDB !== 'undefined';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function asPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putAudio(key: string, blob: Blob): Promise<void> {
  if (!idbSupported()) return;
  const db = await openDb();
  await asPromise(tx(db, 'readwrite').put(blob, key));
}

export async function getAudio(key: string): Promise<Blob | null> {
  if (!idbSupported()) return null;
  try {
    const db = await openDb();
    const got = await asPromise<unknown>(tx(db, 'readonly').get(key));
    return got instanceof Blob ? got : null;
  } catch {
    return null;
  }
}

/** Remove every stored blob belonging to one imported deck. */
export async function deleteByDeck(deckId: string): Promise<void> {
  if (!idbSupported()) return;
  try {
    const db = await openDb();
    const range = IDBKeyRange.bound(`${deckId}/`, `${deckId}/￿`);
    await asPromise(tx(db, 'readwrite').delete(range));
  } catch {
    // best-effort cleanup
  }
}

const MIME_BY_EXT: Record<string, string> = {
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  opus: 'audio/ogg',
};

export function mimeForFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'audio/mpeg';
}

// Object-URL cache so repeat plays don't re-read IndexedDB.
const urlCache = new Map<string, string>();

/** Play an imported audio blob. Resolves false when unavailable (caller falls back to TTS). */
export async function playAudioKey(key: string): Promise<boolean> {
  if (!idbSupported()) return false;
  try {
    let url = urlCache.get(key);
    if (!url) {
      const blob = await getAudio(key);
      if (!blob) return false;
      url = URL.createObjectURL(blob);
      urlCache.set(key, url);
    }
    // Join the shared single-playback gate: interrupt whatever clip/TTS/imported
    // audio is playing, then register this one so a later stopPlayback() (next
    // card or screen unmount) can pause it too. Builtin/TTS and imported audio
    // never overlap.
    stopPlayback();
    const audio = new Audio(url);
    const unregister = registerPlayback(() => {
      try {
        audio.pause();
      } catch {
        // ignore
      }
    });
    audio.onended = unregister;
    audio.onerror = unregister;
    try {
      await audio.play();
    } catch (e) {
      unregister(); // drop the stale stopper so a later stopPlayback() can't run it
      // A newer play() interrupted this one (pause() aborts the pending play).
      // Report success so the caller does NOT fall back to TTS and stomp the
      // playback that just took over.
      if ((e as DOMException)?.name === 'AbortError') return true;
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
