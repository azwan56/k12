export interface DeckDrawResult<T> {
  selected: T[];
  totalPoolSize: number;
  didCycleReset: boolean;
}

const DECK_STORAGE_PREFIX = 'k12_qdeck_v1_';
const MATH_STEM_STORAGE_PREFIX = 'k12_mg_stems_v1_';

export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function shuffleOptionsWithAnswer(
  options: readonly string[],
  answerIndex: number
): { options: string[]; answer: number } {
  const order = shuffleArray(options.map((_, i) => i));
  const mappedIndex = order.indexOf(answerIndex);
  return {
    options: order.map((i) => options[i]),
    answer: mappedIndex >= 0 ? mappedIndex : 0,
  };
}

export function selectUnseenBatch<T>(
  pool: readonly T[],
  getId: (item: T) => string,
  batchSize: number,
  seenIds: readonly string[],
  lastBatchIds: readonly string[] = []
): { selected: T[]; nextSeenIds: string[]; didCycleReset: boolean } {
  const uniquePool: T[] = [];
  const poolIdSet = new Set<string>();
  for (const item of pool) {
    const id = getId(item);
    if (!poolIdSet.has(id)) {
      poolIdSet.add(id);
      uniquePool.push(item);
    }
  }

  if (uniquePool.length === 0 || batchSize <= 0) {
    return {
      selected: [],
      nextSeenIds: [...seenIds],
      didCycleReset: false,
    };
  }

  const k = Math.min(batchSize, uniquePool.length);
  const seenSet = new Set(seenIds.filter((id) => poolIdSet.has(id)));
  const lastBatchSet = new Set(lastBatchIds.filter((id) => poolIdSet.has(id)));

  const unseen = uniquePool.filter((item) => !seenSet.has(getId(item)));
  if (unseen.length >= k) {
    const selected = shuffleArray(unseen).slice(0, k);
    const nextSeen = Array.from(new Set([...seenSet, ...selected.map(getId)]));
    return {
      selected,
      nextSeenIds: nextSeen,
      didCycleReset: false,
    };
  }

  const carry = shuffleArray(unseen);
  const needed = k - carry.length;
  const seenItems = uniquePool.filter((item) => seenSet.has(getId(item)));
  const seenNotLast = seenItems.filter((item) => !lastBatchSet.has(getId(item)));
  const seenInLast = seenItems.filter((item) => lastBatchSet.has(getId(item)));
  const refill = [...shuffleArray(seenNotLast), ...shuffleArray(seenInLast)].slice(0, needed);
  const selected = shuffleArray([...carry, ...refill]);

  return {
    selected,
    nextSeenIds: selected.map(getId),
    didCycleReset: true,
  };
}

interface StoredDeckState {
  seenIds: string[];
  lastBatchIds: string[];
}

function readStoredDeck(key: string): StoredDeckState {
  if (typeof localStorage === 'undefined') {
    return { seenIds: [], lastBatchIds: [] };
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { seenIds: [], lastBatchIds: [] };
    const parsed = JSON.parse(raw) as Partial<StoredDeckState>;
    return {
      seenIds: Array.isArray(parsed.seenIds)
        ? parsed.seenIds.filter((x): x is string => typeof x === 'string')
        : [],
      lastBatchIds: Array.isArray(parsed.lastBatchIds)
        ? parsed.lastBatchIds.filter((x): x is string => typeof x === 'string')
        : [],
    };
  } catch {
    return { seenIds: [], lastBatchIds: [] };
  }
}

function writeStoredDeck(key: string, state: StoredDeckState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage quota / private mode failures
  }
}

export function drawUnseenFromStorage<T>(
  storageScope: string,
  pool: readonly T[],
  getId: (item: T) => string,
  batchSize: number,
  extraSeenIds?: Iterable<string>
): DeckDrawResult<T> {
  const uniquePool: T[] = [];
  const validPoolIds = new Set<string>();
  for (const item of pool) {
    const id = getId(item);
    if (!validPoolIds.has(id)) {
      validPoolIds.add(id);
      uniquePool.push(item);
    }
  }

  const key = `${DECK_STORAGE_PREFIX}${storageScope}`;
  const stored = readStoredDeck(key);
  const mergedSeenSet = new Set<string>();
  for (const id of stored.seenIds) {
    if (validPoolIds.has(id)) mergedSeenSet.add(id);
  }
  if (extraSeenIds) {
    for (const id of extraSeenIds) {
      if (validPoolIds.has(id)) mergedSeenSet.add(id);
    }
  }

  const { selected, nextSeenIds, didCycleReset } = selectUnseenBatch(
    uniquePool,
    getId,
    batchSize,
    Array.from(mergedSeenSet),
    stored.lastBatchIds
  );

  writeStoredDeck(key, {
    seenIds: nextSeenIds.slice(-2000),
    lastBatchIds: selected.map(getId),
  });

  return {
    selected,
    totalPoolSize: uniquePool.length,
    didCycleReset,
  };
}

function normalizeStem(stem: string): string {
  return stem.replace(/\s+/g, ' ').trim().slice(0, 110);
}

export function getRecentMathStems(uid?: string, maxCount = 20): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${MATH_STEM_STORAGE_PREFIX}${uid || 'guest'}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === 'string')
      .map(normalizeStem)
      .filter(Boolean)
      .slice(-Math.max(1, maxCount));
  } catch {
    return [];
  }
}

export function rememberRecentMathStems(uid: string | undefined, stems: readonly string[]): void {
  if (typeof localStorage === 'undefined' || stems.length === 0) return;
  try {
    const key = `${MATH_STEM_STORAGE_PREFIX}${uid || 'guest'}`;
    const existing = getRecentMathStems(uid, 40);
    const dedup = new Set<string>(existing);
    for (const raw of stems) {
      const clean = normalizeStem(raw);
      if (clean) {
        dedup.delete(clean);
        dedup.add(clean);
      }
    }
    localStorage.setItem(key, JSON.stringify(Array.from(dedup).slice(-40)));
  } catch {
    // Ignore storage quota failures
  }
}
