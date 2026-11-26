import type { ActivityType, RecordActivityInput } from './studentProgress';

export const PENDING_ACTIVITIES_STORAGE_KEY = 'k12_pending_activities_v1';
export const MAX_PENDING_ACTIVITIES = 30;
export const PENDING_QUEUE_EVENT = 'k12-pending-activities-changed';

export interface PendingActivityEntry {
  id: string;
  ownerUid: string | null;
  queuedAt: number;
  updatedAt: number;
  input: RecordActivityInput;
}

export function buildDeterministicActivityId(type: ActivityType, createdAt: number): string {
  return `${type}_${createdAt}_${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeEntry(raw: unknown): PendingActivityEntry | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'string' || !obj.id.trim()) return null;
  if (obj.ownerUid !== null && (typeof obj.ownerUid !== 'string' || !obj.ownerUid.trim())) {
    return null;
  }
  if (typeof obj.queuedAt !== 'number' || !Number.isFinite(obj.queuedAt) || obj.queuedAt <= 0) {
    return null;
  }
  if (!obj.input || typeof obj.input !== 'object' || Array.isArray(obj.input)) return null;
  const updatedAt =
    typeof obj.updatedAt === 'number' && Number.isFinite(obj.updatedAt) && obj.updatedAt > 0
      ? obj.updatedAt
      : obj.queuedAt;
  return {
    id: obj.id,
    ownerUid: obj.ownerUid as string | null,
    queuedAt: obj.queuedAt,
    updatedAt,
    input: obj.input as RecordActivityInput,
  };
}

function notifyQueueChanged(): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    window.dispatchEvent(new Event(PENDING_QUEUE_EVENT));
  } catch {
    // Ignore dispatch errors in restricted environments
  }
}

export function loadPendingActivities(): PendingActivityEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_ACTIVITIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeEntry)
      .filter((item): item is PendingActivityEntry => item !== null)
      .sort((a, b) => a.queuedAt - b.queuedAt);
  } catch {
    return [];
  }
}

function savePendingActivities(entries: PendingActivityEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const trimmed = [...entries]
      .sort((a, b) => a.queuedAt - b.queuedAt)
      .slice(-MAX_PENDING_ACTIVITIES);
    if (trimmed.length === 0) {
      localStorage.removeItem(PENDING_ACTIVITIES_STORAGE_KEY);
    } else {
      localStorage.setItem(PENDING_ACTIVITIES_STORAGE_KEY, JSON.stringify(trimmed));
    }
    notifyQueueChanged();
  } catch {
    // Ignore storage quota errors
  }
}

export function enqueuePendingActivity(
  ownerUid: string | null,
  input: RecordActivityInput
): PendingActivityEntry {
  const createdAt =
    typeof input.createdAt === 'number' && Number.isFinite(input.createdAt) && input.createdAt > 0
      ? Math.floor(input.createdAt)
      : Date.now();
  const id =
    typeof input.id === 'string' && input.id.trim()
      ? input.id.trim().replace(/\//g, '').slice(0, 128)
      : buildDeterministicActivityId(input.type, createdAt);

  const normalizedOwner = typeof ownerUid === 'string' && ownerUid.trim() ? ownerUid.trim() : null;
  const all = loadPendingActivities();
  const prev = all.find((item) => item.id === id);
  const updatedAt = Math.max(Date.now(), (prev?.updatedAt ?? 0) + 1);
  const entry: PendingActivityEntry = {
    id,
    ownerUid: normalizedOwner,
    queuedAt: createdAt,
    updatedAt,
    input: {
      ...input,
      id,
      createdAt,
    },
  };

  const existing = all.filter((item) => item.id !== id);
  savePendingActivities([...existing, entry]);
  return entry;
}

export function removePendingActivity(id: string, expectedUpdatedAt?: number): void {
  const safeId = typeof id === 'string' ? id.trim() : '';
  if (!safeId) return;
  const existing = loadPendingActivities();
  const next = existing.filter((item) => {
    if (item.id !== safeId) return true;
    if (expectedUpdatedAt !== undefined && item.updatedAt > expectedUpdatedAt) {
      return true;
    }
    return false;
  });
  if (next.length !== existing.length) {
    savePendingActivities(next);
  }
}

export function getPendingActivitiesForUid(uid: string): PendingActivityEntry[] {
  const safeUid = typeof uid === 'string' ? uid.trim() : '';
  if (!safeUid) return [];
  return loadPendingActivities().filter((item) => item.ownerUid === safeUid);
}

export function getGuestPendingActivities(): PendingActivityEntry[] {
  return loadPendingActivities().filter((item) => item.ownerUid === null);
}

export function clearGuestPendingActivities(): void {
  const existing = loadPendingActivities();
  const next = existing.filter((item) => item.ownerUid !== null);
  if (next.length !== existing.length) {
    savePendingActivities(next);
  }
}

export function subscribePendingQueueChange(listener: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === PENDING_ACTIVITIES_STORAGE_KEY) {
      listener();
    }
  };
  const onLocal = () => listener();
  window.addEventListener(PENDING_QUEUE_EVENT, onLocal);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(PENDING_QUEUE_EVENT, onLocal);
    window.removeEventListener('storage', onStorage);
  };
}
