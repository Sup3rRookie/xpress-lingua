import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';
import { Deck, DeckItem } from '../data/types';
import { durableLoad, durableSave } from './durableStore';

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

// enable_short_term OFF: with it on, a new card graded Good comes due ~10min
// later, so every session re-serves recently learned cards before fresh ones -
// users experience this as "it keeps starting from the same words". Long-term
// scheduling only: first Good pushes a card days out (classic FSRS behavior).
const scheduler = fsrs(generatorParameters({ enable_fuzz: true, enable_short_term: false }));

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
  hskStart?: number; // 1-4: HSK levels up to this are open without completing priors
  jlptStart?: number; // 5,4,3: JLPT levels down to this are open (N5 easiest = 5)
  bonusToday?: { date: string; count: number }; // user-requested extra new cards beyond the pace
}

const emptyStore = (): Store => ({
  cards: {},
  introducedToday: { date: today(), count: 0 },
  streak: { count: 0, last: '' },
  totalReviews: 0,
});

// Local calendar day (YYYY-MM-DD). Uses the device timezone so the daily pace
// and streak roll over at local midnight, not 08:00 for a UTC+8 user.
function localDay(ts: number = Date.now()): string {
  const d = new Date(ts);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function today(): string {
  return localDay();
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

// A store blob is only trusted if `cards` is a real (non-null, non-array) object.
function parseStore(raw: string): Store | null {
  const parsed = JSON.parse(raw);
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !parsed.cards ||
    typeof parsed.cards !== 'object' ||
    Array.isArray(parsed.cards)
  ) {
    return null;
  }
  return { ...emptyStore(), ...parsed };
}

const cardCount = (s: Store) => Object.keys(s.cards).length;

// High-watermark of the largest card count seen this session. Cards only ever
// grow (a review adds, never removes), so a save that would shrink the count is
// always a regression from a bad read and must be refused. Reset only on restore.
let maxCards = 0;
export function resetProgressWatermark(count: number): void {
  maxCards = count;
}

// Read-only load. On any error or corrupt blob returns emptyStore for display;
// this value is NEVER persisted (writes go through mutateStore, which is strict).
export async function loadStore(): Promise<Store> {
  try {
    const { raw } = await durableLoad(KEY);
    if (!raw) return emptyStore();
    const store = parseStore(raw);
    if (!store) return emptyStore();
    if (cardCount(store) > maxCards) maxCards = cardCount(store);
    return store;
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: Store) {
  await durableSave(KEY, JSON.stringify(store));
}

// All writes are serialized here so concurrent load-modify-save operations can
// never clobber each other. Critically, a write is ABORTED (not saved) when the
// read was uncertain or would shrink progress, so a transient storage failure
// can never overwrite live data with an empty store.
let writeQueue: Promise<void> = Promise.resolve();
function mutateStore(fn: (store: Store) => void): Promise<void> {
  const run = async () => {
    const res = await durableLoad(KEY);
    if (res.readError) return; // uncertain read: do not risk clobbering
    let store: Store;
    if (res.raw == null) {
      store = emptyStore(); // confirmed empty: genuinely a new user
    } else {
      const parsed = parseStore(res.raw);
      if (!parsed) return; // corrupt but read succeeded: skip rather than overwrite
      store = parsed;
    }
    if (cardCount(store) > maxCards) maxCards = cardCount(store);
    fn(store);
    if (cardCount(store) < maxCards) return; // regression guard: never shrink
    maxCards = cardCount(store);
    await saveStore(store);
  };
  writeQueue = writeQueue.then(run, run);
  // Never reject to callers; a failed write is logged by being dropped, not thrown.
  return writeQueue.catch(() => {});
}

export interface SessionQueue {
  due: DeckItem[];
  fresh: DeckItem[];
}

const hskLevel = (scenarioId: string): number | null => {
  const m = scenarioId.match(/^hsk(\d)$/);
  return m ? Number(m[1]) : null;
};
const jlptLevel = (scenarioId: string): number | null => {
  const m = scenarioId.match(/^n(\d)$/);
  return m ? Number(m[1]) : null;
};

// A ladder scenario is "opened by the start setting" if its level is within the
// chosen start. HSK counts up (1 easiest), JLPT counts down (N5=5 easiest), so
// the direction differs.
function openedByStart(scenarioId: string, hskStart: number, jlptStart: number): boolean {
  const h = hskLevel(scenarioId);
  if (h !== null) return h <= hskStart;
  const j = jlptLevel(scenarioId);
  if (j !== null) return j >= jlptStart;
  return false;
}

// Sequential scenario gating: the first scenario is always open; each next one
// unlocks once every card of the previous scenario has been met. Single-scenario
// decks (imported Anki decks) are effectively ungated. Ladder decks (HSK/JLPT)
// honor a user-chosen starting level: every level up to the start is open.
export function unlockedScenarioIds(
  deck: Deck,
  cardIds: Set<string>,
  hskStart = 1,
  jlptStart = 5,
): Set<string> {
  const unlocked = new Set<string>();
  for (let i = 0; i < deck.scenarios.length; i++) {
    const sc = deck.scenarios[i];
    if (openedByStart(sc.id, hskStart, jlptStart)) {
      unlocked.add(sc.id);
      continue;
    }
    if (i === 0) {
      unlocked.add(sc.id);
      continue;
    }
    const prev = deck.scenarios[i - 1].id;
    const prevDone = deck.items
      .filter((it) => it.scenario === prev)
      .every((it) => cardIds.has(it.id));
    if (!prevDone) break;
    unlocked.add(sc.id);
  }
  return unlocked;
}

export async function getHskStart(): Promise<number> {
  const store = await loadStore();
  return store.hskStart ?? 1;
}

export async function setHskStart(level: number): Promise<void> {
  return mutateStore((store) => {
    store.hskStart = Math.min(4, Math.max(1, level));
  });
}

export async function getJlptStart(): Promise<number> {
  const store = await loadStore();
  return store.jlptStart ?? 5;
}

export async function setJlptStart(level: number): Promise<void> {
  return mutateStore((store) => {
    store.jlptStart = Math.min(5, Math.max(3, level));
  });
}

// "Keep going": the daily cap is a default, not a wall. Grants extra new-card
// budget for today only.
export async function grantBonusCards(n: number): Promise<void> {
  return mutateStore((store) => {
    const bonus = store.bonusToday?.date === today() ? store.bonusToday.count : 0;
    store.bonusToday = { date: today(), count: bonus + n };
  });
}

export async function getPace(): Promise<(typeof PACES)[number]> {
  const store = await loadStore();
  return paceById(store.pace ?? DEFAULT_PACE);
}

export async function setPace(id: PaceId): Promise<void> {
  return mutateStore((store) => {
    store.pace = id;
  });
}

export async function buildQueue(deck: Deck): Promise<SessionQueue> {
  const store = await loadStore();
  const now = new Date();
  const due = deck.items.filter((it) => {
    const s = store.cards[it.id];
    return s && new Date(s.due) <= now;
  });
  const introduced = store.introducedToday.date === today() ? store.introducedToday.count : 0;
  const bonus = store.bonusToday?.date === today() ? store.bonusToday.count : 0;
  const freshBudget = Math.max(
    0,
    paceById(store.pace ?? DEFAULT_PACE).perDay + bonus - introduced,
  );
  const hskStart = store.hskStart ?? 1;
  const jlptStart = store.jlptStart ?? 5;
  const unlocked = unlockedScenarioIds(
    deck,
    new Set(Object.keys(store.cards)),
    hskStart,
    jlptStart,
  );
  // When the user starts at a higher level, its words come before leftovers from
  // the skipped easier levels (HSK counts up, JLPT counts down).
  const backfill = (it: DeckItem) => {
    const h = hskLevel(it.scenario);
    if (h !== null) return h < hskStart ? 1 : 0;
    const j = jlptLevel(it.scenario);
    if (j !== null) return j > jlptStart ? 1 : 0;
    return 0;
  };
  const fresh = deck.items
    .filter((it) => !store.cards[it.id] && unlocked.has(it.scenario))
    .sort((a, b) => backfill(a) - backfill(b))
    .slice(0, freshBudget);
  return { due, fresh };
}

export async function review(itemId: string, rating: Grade): Promise<void> {
  return mutateStore((store) => {
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
      const yesterday = localDay(Date.now() - 86_400_000);
      const dayBefore = localDay(Date.now() - 2 * 86_400_000);
      // Merciful streak: one missed day doesn't break it (punitive streaks churn users).
      store.streak.count =
        store.streak.last === yesterday || store.streak.last === dayBefore
          ? store.streak.count + 1
          : 1;
      store.streak.last = today();
    }
  });
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
  const unlocked = unlockedScenarioIds(
    deck,
    metIds,
    store.hskStart ?? 1,
    store.jlptStart ?? 5,
  );
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
