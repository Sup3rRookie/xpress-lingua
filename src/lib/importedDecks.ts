import AsyncStorage from '@react-native-async-storage/async-storage';
import { Deck } from '../data/types';
import { deleteByDeck } from './mediaStore';

// Imported Anki decks, stored whole as lean JSON. Separate key from the SRS
// store ('xl-store-v1') so existing data is untouched.
const KEY = 'xl-imported-decks-v1';

export interface ImportedDeck {
  id: string;
  name: string;
  importedAt: string; // ISO date-time
  itemCount: number;
  sourceNoteType: string;
  deck: Deck;
}

export async function listImportedDecks(): Promise<ImportedDeck[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveImportedDeck(record: ImportedDeck): Promise<void> {
  const all = await listImportedDecks();
  const next = [...all.filter((d) => d.id !== record.id), record];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

/** Remove a deck and its stored audio. Leaves SRS history untouched. */
export async function removeImportedDeck(id: string): Promise<void> {
  const all = await listImportedDecks();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter((d) => d.id !== id)));
  await deleteByDeck(id);
}

export function newDeckId(): string {
  return `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
