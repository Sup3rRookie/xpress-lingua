import AsyncStorage from '@react-native-async-storage/async-storage';
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';
import { Deck, DeckItem } from '../data/types';

const KEY = 'xl-store-v1';
const NEW_PER_DAY = 8;

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

export async function buildQueue(deck: Deck): Promise<SessionQueue> {
  const store = await loadStore();
  const now = new Date();
  const due = deck.items.filter((it) => {
    const s = store.cards[it.id];
    return s && new Date(s.due) <= now;
  });
  const introduced = store.introducedToday.date === today() ? store.introducedToday.count : 0;
  const freshBudget = Math.max(0, NEW_PER_DAY - introduced);
  const fresh = deck.items.filter((it) => !store.cards[it.id]).slice(0, freshBudget);
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
    store.streak.count = store.streak.last === yesterday ? store.streak.count + 1 : 1;
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
  perScenario: Record<string, { seen: number; total: number }>;
}

export async function deckStats(deck: Deck): Promise<DeckStats> {
  const store = await loadStore();
  const q = await buildQueue(deck);
  const perScenario: DeckStats['perScenario'] = {};
  for (const sc of deck.scenarios) perScenario[sc.id] = { seen: 0, total: 0 };
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
  };
}

export { Rating };
export type { Grade };
