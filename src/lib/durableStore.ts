import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Durable key/value store for learner progress.
//
// The bug this fixes: on mobile browsers (notably iOS Safari) localStorage is
// evicted under storage pressure or inactivity, wiping all progress. Defenses:
//   1) request persistent storage so the browser stops evicting us,
//   2) mirror every write to BOTH localStorage and IndexedDB. They are evicted
//      independently, so whichever survives restores the other on next load,
//   3) tag every write with a timestamp and, on load, trust the newest copy.
//
// The localStorage copy stays under the original key and raw-JSON format so the
// existing backup/restore feature and already-stored progress keep working.

const TS_SUFFIX = '_ts';
const DB_NAME = 'xl-progress';
const DB_STORE = 'kv';

let persistRequested = false;
export async function requestPersistence(): Promise<void> {
  if (persistRequested || Platform.OS !== 'web' || typeof navigator === 'undefined') return;
  persistRequested = true;
  try {
    await navigator.storage?.persist?.();
  } catch {
    // best effort
  }
}

// --- IndexedDB helpers (web only) ---
function idbOpen(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(DB_STORE)) {
          req.result.createObjectStore(DB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// Distinguishes "read failed" (error true) from "no value stored" (value null,
// error false). The caller must never treat a failed read as an empty store.
function idbGet(
  key: string,
): Promise<{ value: { ts: number; raw: string } | null; error: boolean }> {
  return new Promise((resolve) => {
    idbOpen().then((db) => {
      if (!db) return resolve({ value: null, error: true });
      try {
        const tx = db.transaction(DB_STORE, 'readonly');
        const req = tx.objectStore(DB_STORE).get(key);
        req.onsuccess = () => resolve({ value: req.result ?? null, error: false });
        req.onerror = () => resolve({ value: null, error: true });
      } catch {
        resolve({ value: null, error: true });
      }
    });
  });
}

function idbSet(key: string, value: { ts: number; raw: string }): Promise<void> {
  return new Promise((resolve) => {
    idbOpen().then((db) => {
      if (!db) return resolve();
      try {
        const tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  });
}

export interface LoadResult {
  raw: string | null;
  // true when a backend errored so we could NOT determine the real state.
  // Writers must abort rather than risk overwriting live data with an empty store.
  readError: boolean;
}

// Load the freshest surviving copy. Heals whichever backend lost its data.
export async function durableLoad(key: string): Promise<LoadResult> {
  if (Platform.OS !== 'web') {
    try {
      return { raw: await AsyncStorage.getItem(key), readError: false };
    } catch {
      return { raw: null, readError: true };
    }
  }
  let local: { ts: number; raw: string } | null = null;
  let localError = false;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw != null) {
      const ts = Number((await AsyncStorage.getItem(key + TS_SUFFIX)) ?? 0);
      local = { ts, raw };
    }
  } catch {
    localError = true;
  }
  const idb = await idbGet(key);

  const candidates = [local, idb.value].filter(Boolean) as { ts: number; raw: string }[];
  if (candidates.length === 0) {
    // No data anywhere. If either backend errored, this is an uncertain read,
    // not a confirmed empty store.
    return { raw: null, readError: localError || idb.error };
  }
  candidates.sort((a, b) => b.ts - a.ts);
  const best = candidates[0];

  // Heal: make sure both backends hold the winning copy.
  if (!local || local.raw !== best.raw) {
    try {
      await AsyncStorage.setItem(key, best.raw);
      await AsyncStorage.setItem(key + TS_SUFFIX, String(best.ts));
    } catch {
      // ignore
    }
  }
  if (!idb.value || idb.value.raw !== best.raw) {
    await idbSet(key, best);
  }
  return { raw: best.raw, readError: false };
}

export async function durableSave(key: string, raw: string): Promise<void> {
  const ts = Date.now();
  if (Platform.OS !== 'web') {
    await AsyncStorage.setItem(key, raw);
    return;
  }
  try {
    await AsyncStorage.setItem(key, raw);
    await AsyncStorage.setItem(key + TS_SUFFIX, String(ts));
  } catch {
    // ignore
  }
  await idbSet(key, { ts, raw });
}
