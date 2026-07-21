import AsyncStorage from '@react-native-async-storage/async-storage';
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';
import { Deck, DeckItem } from '../data/types';

const KEY = 'xl-store-v1';

// Daily new-card pace. Every new card generates ~5-8 future reviews, so Beast
// mode only suits a genuine 60-min/day habit.
export const PACES = [
  { id: 'relaxed', label: 'Relaxed', perDay: 5 },
  { id: 'standard', label: 'Standard', perDay: 8 },
  { id: 'fast', label: 'Fast', perDay: 15 },
  { id: 'beast', label: 'Beast', perDay: 25 },
] as const;
export type PaceId = (typeof PACES)[number]['id'];
const DEFAULT_PACE: PaceId = 'standard';

export function paceById(id: string | undefined) {
  return PACES.find((p) => p.id === id) ?? PACES[1];
}

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

type SerializedCard = Omit<Card, 'due' | 'last_review'> & {
  due: string;
  last_review?: string;
};

interface Store {
  cards: Record<string, SerializedCard>;
  introducedToday: { date: string; count: number };
  streak: { count: number; last: string };
  totalReviews: number;
  pace?: PaceId;
}

const emptyStore = (): Store => ({
  cards: {},
  introducedToday: { date: today(), count: 0 },
  streak: { count: 0, last: '' },
  totalReviews: 0,
});

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function reviveCard(s: SerializedCard): Card {
  return {
    ...s,
    due: new Date(s.due),
    last_review: s.last_review ? new Date(s.last_review) : undefined,
  } as Card;
}

function serializeCard(c: Card): SerializedCard {
  return {
    ...c,
    due: c.due.toISOString(),
    last_review: c.last_review?.toISOString(),
  };
}

export async function loadStore(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyStore();
    return { ...emptyStore(), ...JSON.parse(raw) };
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: Store) {
  await AsyncStorage.setItem(KEY, JSON.stringify(store));
}

export interface SessionQueue {
  due: DeckItem[];
  fresh: DeckItem[];
}

// Sequential scenario gating: the first scenario is always open; each next one
// unlocks once every card of the previous scenario has been met. Single-scenario
// decks (imported Anki decks) are effectively ungated.
export function unlockedScenarioIds(deck: Deck, cardIds: Set<string>): Set<string> {
  const unlocked = new Set<string>();
  for (let i = 0; i < deck.scenarios.length; i++) {
    if (i === 0) {
      unlocked.add(deck.scenarios[i].id);
      continue;
    }
    const prev = deck.scenarios[i - 1].id;
    const prevDone = deck.items
      .filter((it) => it.scenario === prev)
      .every((it) => cardIds.has(it.id));
    if (!prevDone) break;
    unlocked.add(deck.scenarios[i].id);
  }
  return unlocked;
}

export async function getPace(): Promise<(typeof PACES)[number]> {
  const store = await loadStore();
  return paceById(store.pace ?? DEFAULT_PACE);
}

export async function setPace(id: PaceId): Promise<void> {
  const store = await loadStore();
  store.pace = id;
  await saveStore(store);
}

export async function buildQueue(deck: Deck): Promise<SessionQueue> {
  const store = await loadStore();
  const now = new Date();
  const due = deck.items.filter((it) => {
    const s = store.cards[it.id];
    return s && new Date(s.due) <= now;
  });
  const introduced = store.introducedToday.date === today() ? store.introducedToday.count : 0;
  const freshBudget = Math.max(0, paceById(store.pace ?? DEFAULT_PACE).perDay - introduced);
  const unlocked = unlockedScenarioIds(deck, new Set(Object.keys(store.cards)));
  const fresh = deck.items
    .filter((it) => !store.cards[it.id] && unlocked.has(it.scenario))
    .slice(0, freshBudget);
  return { due, fresh };
}

export async function review(itemId: string, rating: Grade): Promise<void> {
  const store = await loadStore();
  const now = new Date();
  const existing = store.cards[itemId];
  const isNew = !existing;
  const card = existing ? reviveCard(existing) : createEmptyCard(now);
  const result = scheduler.next(card, now, rating);
  store.cards[itemId] = serializeCard(result.card);
  store.totalReviews += 1;

  if (isNew) {
    if (store.introducedToday.date !== today()) {
      store.introducedToday = { date: today(), count: 0 };
    }
    store.introducedToday.count += 1;
  }

  if (store.streak.last !== today()) {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const dayBefore = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
    // Merciful streak: one missed day doesn't break it (punitive streaks churn users).
    store.streak.count =
      store.streak.last === yesterday || store.streak.last === dayBefore
        ? store.streak.count + 1
        : 1;
    store.streak.last = today();
  }

  await saveStore(store);
}

export interface DeckStats {
  dueCount: number;
  freshAvailable: number;
  learned: number;
  total: number;
  streak: number;
  totalReviews: number;
  perScenario: Record<string, { seen: number; total: number; unlocked: boolean }>;
  pace: (typeof PACES)[number];
  metIds: Set<string>;
}

export async function deckStats(deck: Deck): Promise<DeckStats> {
  const store = await loadStore();
  const q = await buildQueue(deck);
  const metIds = new Set(Object.keys(store.cards));
  const unlocked = unlockedScenarioIds(deck, metIds);
  const perScenario: DeckStats['perScenario'] = {};
  for (const sc of deck.scenarios) {
    perScenario[sc.id] = { seen: 0, total: 0, unlocked: unlocked.has(sc.id) };
  }
  let learned = 0;
  for (const it of deck.items) {
    perScenario[it.scenario].total += 1;
    if (store.cards[it.id]) {
      perScenario[it.scenario].seen += 1;
      learned += 1;
    }
  }
  return {
    dueCount: q.due.length,
    freshAvailable: q.fresh.length,
    learned,
    total: deck.items.length,
    streak: store.streak.count,
    totalReviews: store.totalReviews,
    perScenario,
    pace: paceById(store.pace ?? DEFAULT_PACE),
    metIds,
  };
}

export { Rating };
export type { Grade };
