import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { durableLoad, durableSave } from './durableStore';

// Progress backup: FSRS state, streak, pace, and imported deck definitions
// (imported media blobs are NOT included, decks re-link audio on re-import).
const STORE_KEY = 'xl-store-v1';
const KEYS = [STORE_KEY, 'xl-imported-decks-v1'];

export async function exportBackup(): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  const payload: Record<string, unknown> = {
    app: 'xpress-lingua',
    version: 1,
    exportedAt: new Date().toISOString(),
  };
  for (const k of KEYS) {
    const raw = k === STORE_KEY ? await durableLoad(k) : await AsyncStorage.getItem(k);
    if (raw) payload[k] = JSON.parse(raw);
  }
  const blob = new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `xpress-lingua-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

export function importBackup(): Promise<'ok' | 'invalid' | 'cancelled'> {
  if (Platform.OS !== 'web') return Promise.resolve('cancelled');
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve('cancelled');
      try {
        const data = JSON.parse(await file.text());
        if (data.app !== 'xpress-lingua') return resolve('invalid');
        for (const k of KEYS) {
          if (!data[k]) continue;
          const raw = JSON.stringify(data[k]);
          if (k === STORE_KEY) await durableSave(k, raw);
          else await AsyncStorage.setItem(k, raw);
        }
        resolve('ok');
      } catch {
        resolve('invalid');
      }
    };
    input.oncancel = () => resolve('cancelled');
    input.click();
  });
}
