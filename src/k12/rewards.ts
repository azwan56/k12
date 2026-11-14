export type DailyTaskKey = 'practice' | 'wordsmith' | 'challenge';

export interface DailyProgress {
  date: string; // YYYY-MM-DD (local time)
  tasks: Record<DailyTaskKey, boolean>;
  goalAwarded: boolean;
}

export interface StreakState {
  current: number;
  longest: number;
  lastCompletedDate: string | null;
  freezes: number;
  weeklyCheckIns: number; // 0..4; reaching 5 grants +1 freeze
  milestoneClaimed: number[];
}

export interface WishItem {
  id: string;
  title: string;
  cost: number;
  emoji: string;
}

export interface RedemptionRequest {
  id: string;
  wishId: string;
  title: string;
  cost: number;
  emoji: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: number;
  resolvedAt?: number;
}

export interface RewardsState {
  coins: number;
  xp: number;
  activeTitleId: string;
  streak: StreakState;
  daily: DailyProgress;
  wishes: WishItem[];
  redemptions: RedemptionRequest[];
  essayAwardedDates: Record<string, string>; // promptId -> YYYY-MM-DD
  updatedAt: number;
}

export interface TitleDef {
  id: string;
  label: string;
  emoji: string;
  minXp: number;
}

export const TITLES: TitleDef[] = [
  { id: 'rookie', label: '学习萌新', emoji: '🌱', minXp: 0 },
  { id: 'explorer', label: '探索小达人', emoji: '🧭', minXp: 50 },
  { id: 'writer', label: '双语小作家', emoji: '✍️', minXp: 150 },
  { id: 'scientist', label: '科学探险家', emoji: '🔬', minXp: 300 },
  { id: 'guardian', label: '全勤守护者', emoji: '🛡️', minXp: 600 }
];

export const STREAK_MILESTONES: Record<number, number> = {
  3: 20,
  7: 50,
  14: 100,
  30: 200
};

export const DAILY_GOAL_TARGET = 2;
export const DAILY_GOAL_BONUS_COINS = 20;

export const DEFAULT_WISHES: WishItem[] = [
  { id: 'movie', title: '挑一部周末电影', cost: 50, emoji: '🎬' },
  { id: 'game', title: '30 分钟自由游戏时间', cost: 100, emoji: '🎮' },
  { id: 'book', title: '买一本想看的书', cost: 300, emoji: '📚' }
];

export const STORAGE_KEY = 'k12_rewards_v1';

/** Local calendar date YYYY-MM-DD. */
export function getLocalDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Whole calendar days between two YYYY-MM-DD strings (b - a). */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const utcA = Date.UTC(ay, am - 1, ad);
  const utcB = Date.UTC(by, bm - 1, bd);
  return Math.round((utcB - utcA) / 86_400_000);
}

export function createInitialRewardsState(today: string = getLocalDateStr()): RewardsState {
  return {
    coins: 0,
    xp: 0,
    activeTitleId: 'rookie',
    streak: {
      current: 0,
      longest: 0,
      lastCompletedDate: null,
      freezes: 1, // Starter shield so first-time learners feel protected
      weeklyCheckIns: 0,
      milestoneClaimed: []
    },
    daily: {
      date: today,
      tasks: { practice: false, wordsmith: false, challenge: false },
      goalAwarded: false
    },
    wishes: DEFAULT_WISHES,
    redemptions: [],
    essayAwardedDates: {},
    updatedAt: 0
  };
}

function clampNonNegInt(val: unknown, fallback = 0): number {
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function sanitizeWishItem(raw: unknown): WishItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const w = raw as Record<string, unknown>;
  const id = typeof w.id === 'string' && w.id.trim() ? w.id.trim().slice(0, 64) : '';
  const title = typeof w.title === 'string' ? w.title.trim().slice(0, 60) : '';
  if (!id || !title) return null;
  const rawCost = Number(w.cost);
  const cost = Number.isFinite(rawCost) ? Math.min(100_000, Math.max(1, Math.floor(rawCost))) : 50;
  const emoji = typeof w.emoji === 'string' && w.emoji.trim() ? w.emoji.trim().slice(0, 8) : '🎁';
  return { id, title, cost, emoji };
}

function sanitizeRedemption(raw: unknown): RedemptionRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' && r.id.trim() ? r.id.trim().slice(0, 64) : '';
  const wishId = typeof r.wishId === 'string' ? r.wishId.slice(0, 64) : '';
  const title = typeof r.title === 'string' ? r.title.trim().slice(0, 60) : '';
  if (!id || !title) return null;
  const status = r.status === 'approved' || r.status === 'rejected' ? r.status : 'pending';
  const rawCost = Number(r.cost);
  const cost = Number.isFinite(rawCost) ? Math.min(100_000, Math.max(1, Math.floor(rawCost))) : 50;
  const emoji = typeof r.emoji === 'string' && r.emoji.trim() ? r.emoji.trim().slice(0, 8) : '🎁';
  const requestedAt = clampNonNegInt(r.requestedAt, 0);
  const resolvedAt = r.resolvedAt !== undefined ? clampNonNegInt(r.resolvedAt, 0) : undefined;
  return { id, wishId, title, cost, emoji, status, requestedAt, ...(resolvedAt ? { resolvedAt } : {}) };
}

/** Sanitize untrusted localStorage / Firestore data into a valid RewardsState. */
export function sanitizeRewardsState(
  raw: Partial<RewardsState> | null | undefined,
  today: string = getLocalDateStr()
): RewardsState {
  const init = createInitialRewardsState(today);
  if (!raw || typeof raw !== 'object') return init;

  const wishes = Array.isArray(raw.wishes)
    ? raw.wishes.map(sanitizeWishItem).filter((w): w is WishItem => w !== null).slice(0, 30)
    : [];
  const redemptions = Array.isArray(raw.redemptions)
    ? raw.redemptions.map(sanitizeRedemption).filter((r): r is RedemptionRequest => r !== null).slice(0, 30)
    : [];

  const essayAwardedDates: Record<string, string> = {};
  if (raw.essayAwardedDates && typeof raw.essayAwardedDates === 'object') {
    for (const [k, v] of Object.entries(raw.essayAwardedDates).slice(0, 50)) {
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        essayAwardedDates[k.slice(0, 40)] = v;
      }
    }
  }

  const rawStreak = (raw.streak ?? {}) as Partial<StreakState>;
  const rawDaily = (raw.daily ?? {}) as Partial<DailyProgress>;
  const rawTasks = (rawDaily.tasks ?? {}) as Partial<Record<DailyTaskKey, boolean>>;
  const milestoneClaimed = Array.isArray(rawStreak.milestoneClaimed)
    ? rawStreak.milestoneClaimed.map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];

  return normalizeForToday(
    {
      coins: clampNonNegInt(raw.coins, 0),
      xp: clampNonNegInt(raw.xp, 0),
      activeTitleId:
        typeof raw.activeTitleId === 'string' && TITLES.some((t) => t.id === raw.activeTitleId)
          ? raw.activeTitleId
          : init.activeTitleId,
      streak: {
        current: clampNonNegInt(rawStreak.current, 0),
        longest: clampNonNegInt(rawStreak.longest, 0),
        lastCompletedDate:
          typeof rawStreak.lastCompletedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawStreak.lastCompletedDate)
            ? rawStreak.lastCompletedDate
            : null,
        freezes: clampNonNegInt(rawStreak.freezes, init.streak.freezes),
        weeklyCheckIns: Math.min(4, clampNonNegInt(rawStreak.weeklyCheckIns, 0)),
        milestoneClaimed
      },
      daily: {
        date: typeof rawDaily.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDaily.date) ? rawDaily.date : today,
        tasks: {
          practice: Boolean(rawTasks.practice),
          wordsmith: Boolean(rawTasks.wordsmith),
          challenge: Boolean(rawTasks.challenge)
        },
        goalAwarded: Boolean(rawDaily.goalAwarded)
      },
      wishes: wishes.length > 0 ? wishes : init.wishes,
      redemptions,
      essayAwardedDates,
      updatedAt: clampNonNegInt(raw.updatedAt, 0)
    },
    today
  );
}

/** Ensure daily progress rolls over when the local calendar date changes. */
export function normalizeForToday(state: RewardsState, today: string = getLocalDateStr()): RewardsState {
  if (state.daily.date === today) return state;
  return {
    ...state,
    daily: {
      date: today,
      tasks: { practice: false, wordsmith: false, challenge: false },
      goalAwarded: false
    }
  };
}

export function countCompletedDailyTasks(daily: DailyProgress): number {
  return Object.values(daily.tasks).filter(Boolean).length;
}

export function getUnlockedTitles(xp: number): TitleDef[] {
  return TITLES.filter((t) => xp >= t.minXp);
}

export function getActiveTitle(state: RewardsState): TitleDef {
  const unlocked = getUnlockedTitles(state.xp);
  return unlocked.find((t) => t.id === state.activeTitleId) ?? unlocked[unlocked.length - 1] ?? TITLES[0];
}

export interface ActivityRewardInput {
  coinsEarned: number;
  xpEarned: number;
  taskKey?: DailyTaskKey;
  today?: string;
}

export interface ActivityRewardOutcome {
  nextState: RewardsState;
  coinsAdded: number;
  bonusCoins: number;
  dailyGoalJustCompleted: boolean;
  freezeUsed: boolean;
  freezeEarned: boolean;
  milestoneReached: number | null;
}

/** Pure state transition when a student finishes a learning activity. */
export function applyActivityReward(
  rawState: RewardsState,
  { coinsEarned, xpEarned, taskKey, today = getLocalDateStr() }: ActivityRewardInput
): ActivityRewardOutcome {
  const base = normalizeForToday(rawState, today);
  const nextTasks = taskKey ? { ...base.daily.tasks, [taskKey]: true } : { ...base.daily.tasks };
  const completedCount = Object.values(nextTasks).filter(Boolean).length;

  let bonusCoins = 0;
  let dailyGoalJustCompleted = false;
  let freezeUsed = false;
  let freezeEarned = false;
  let milestoneReached: number | null = null;
  let nextStreak = { ...base.streak };
  let goalAwarded = base.daily.goalAwarded;

  if (!goalAwarded && completedCount >= DAILY_GOAL_TARGET) {
    goalAwarded = true;
    dailyGoalJustCompleted = true;
    bonusCoins += DAILY_GOAL_BONUS_COINS;

    if (nextStreak.lastCompletedDate !== today) {
      const gap = nextStreak.lastCompletedDate ? diffDays(nextStreak.lastCompletedDate, today) : null;
      if (gap === 1) {
        nextStreak.current += 1;
      } else if (gap === 2 && nextStreak.freezes > 0) {
        nextStreak.freezes -= 1;
        nextStreak.current += 1;
        freezeUsed = true;
      } else {
        nextStreak.current = 1;
      }
      nextStreak.longest = Math.max(nextStreak.longest, nextStreak.current);
      nextStreak.lastCompletedDate = today;

      // Every 5 daily completions grants +1 shield card
      nextStreak.weeklyCheckIns += 1;
      if (nextStreak.weeklyCheckIns >= 5) {
        nextStreak.weeklyCheckIns = 0;
        nextStreak.freezes += 1;
        freezeEarned = true;
      }

      // Check streak milestone bonuses
      for (const [daysStr, reward] of Object.entries(STREAK_MILESTONES)) {
        const days = Number(daysStr);
        if (nextStreak.current >= days && !nextStreak.milestoneClaimed.includes(days)) {
          nextStreak.milestoneClaimed = [...nextStreak.milestoneClaimed, days];
          bonusCoins += reward;
          milestoneReached = days;
        }
      }
    }
  }

  const nextState: RewardsState = {
    ...base,
    coins: base.coins + coinsEarned + bonusCoins,
    xp: base.xp + xpEarned,
    streak: nextStreak,
    daily: {
      date: today,
      tasks: nextTasks,
      goalAwarded
    },
    updatedAt: Date.now()
  };

  return {
    nextState,
    coinsAdded: coinsEarned + bonusCoins,
    bonusCoins,
    dailyGoalJustCompleted,
    freezeUsed,
    freezeEarned,
    milestoneReached
  };
}

/** Merge local and remote rewards states without losing newer edits or higher XP. */
export function mergeRewards(local: RewardsState, remote: Partial<RewardsState>): RewardsState {
  const remoteNorm = sanitizeRewardsState(remote);
  const localNorm = sanitizeRewardsState(local);
  if (localNorm.xp > remoteNorm.xp) return localNorm;
  if (remoteNorm.xp > localNorm.xp) return remoteNorm;
  return localNorm.updatedAt >= remoteNorm.updatedAt ? localNorm : remoteNorm;
}

export function loadLocalRewards(): RewardsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialRewardsState();
    const parsed = JSON.parse(raw) as Partial<RewardsState>;
    return sanitizeRewardsState(parsed);
  } catch {
    return createInitialRewardsState();
  }
}

export function saveLocalRewards(state: RewardsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}
