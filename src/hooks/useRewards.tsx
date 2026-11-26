import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isCnRegion } from '../lib/region';
import { cnApi } from '../lib/cnApi';
import { useAuth } from './useAuth';
import {
  ActivityRewardOutcome,
  RewardsState,
  WishItem,
  applyActivityReward,
  getLocalDateStr,
  getUnlockedTitles,
  loadLocalRewards,
  mergeRewards,
  normalizeForToday,
  saveLocalRewards
} from '../k12/rewards';

interface RewardsContextValue {
  rewards: RewardsState;
  recordPractice: (correct: number, total: number) => ActivityRewardOutcome;
  recordWordsmith: (totalStars: number) => ActivityRewardOutcome;
  recordMathGenius: (correct: number, total: number) => ActivityRewardOutcome;
  recordEssay: (promptId: string) => ActivityRewardOutcome | null;
  setActiveTitle: (titleId: string) => void;
  requestRedemption: (wish: WishItem) => boolean;
  resolveRedemption: (redemptionId: string, approve: boolean) => void;
  addWish: (wish: Omit<WishItem, 'id'>) => void;
  removeWish: (wishId: string) => void;
}

const RewardsContext = createContext<RewardsContextValue | null>(null);

export { mergeRewards };

export function RewardsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<RewardsState>(() => loadLocalRewards());
  const rewardsRef = useRef(rewards);
  rewardsRef.current = rewards;

  const persist = useCallback(
    (next: RewardsState) => {
      rewardsRef.current = next;
      setRewards(next);
      saveLocalRewards(next);
      if (user) {
        if (isCnRegion()) {
          cnApi.updateRewards(next).catch((err) => {
            console.error('Failed to sync K12 rewards to CN API:', err);
          });
        } else {
          const userRef = doc(db, 'users', user.uid);
          setDoc(userRef, { k12Rewards: next }, { merge: true }).catch((err) => {
            console.error('Failed to sync K12 rewards to Firestore:', err);
          });
        }
      }
    },
    [user]
  );

  // Sync with Firestore / CN API when user signs in
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        if (isCnRegion()) {
          const state = await cnApi.getUserState();
          if (cancelled) return;
          if (state.rewards && Object.keys(state.rewards).length > 0) {
            const merged = mergeRewards(rewardsRef.current, state.rewards as Partial<RewardsState>);
            rewardsRef.current = merged;
            setRewards(merged);
            saveLocalRewards(merged);
            if (merged.updatedAt > ((state.rewards as { updatedAt?: number }).updatedAt ?? 0)) {
              cnApi.updateRewards(merged).catch(() => {});
            }
          } else if (rewardsRef.current.xp > 0 || rewardsRef.current.coins > 0) {
            cnApi.updateRewards(rewardsRef.current).catch(() => {});
          }
          return;
        }
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (cancelled) return;
        const data = snap.exists() ? snap.data() : null;
        if (data?.k12Rewards) {
          const merged = mergeRewards(rewardsRef.current, data.k12Rewards as Partial<RewardsState>);
          rewardsRef.current = merged;
          setRewards(merged);
          saveLocalRewards(merged);
          if (merged.updatedAt > (data.k12Rewards.updatedAt ?? 0)) {
            setDoc(userRef, { k12Rewards: merged }, { merge: true }).catch(() => {});
          }
        } else if (rewardsRef.current.xp > 0 || rewardsRef.current.coins > 0) {
          setDoc(userRef, { k12Rewards: rewardsRef.current }, { merge: true }).catch(() => {});
        }
      } catch (err) {
        console.error('Error loading K12 rewards from Firestore:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const recordPractice = useCallback(
    (correct: number, total: number): ActivityRewardOutcome => {
      const ratio = total > 0 ? correct / total : 0;
      const coinsEarned = ratio === 1 ? 24 : ratio >= 0.6 ? 12 : 3;
      const xpEarned = ratio >= 0.6 ? 15 : 5;
      const taskKey = ratio >= 0.7 ? 'practice' : undefined;
      const outcome = applyActivityReward(rewardsRef.current, { coinsEarned, xpEarned, taskKey });
      persist(outcome.nextState);
      return outcome;
    },
    [persist]
  );

  const recordWordsmith = useCallback(
    (totalStars: number): ActivityRewardOutcome => {
      const coinsEarned = Math.max(5, totalStars * 2);
      const xpEarned = Math.max(10, totalStars * 2);
      const outcome = applyActivityReward(rewardsRef.current, {
        coinsEarned,
        xpEarned,
        taskKey: 'wordsmith'
      });
      persist(outcome.nextState);
      return outcome;
    },
    [persist]
  );

  const recordMathGenius = useCallback(
    (correct: number, total: number): ActivityRewardOutcome => {
      const ratio = total > 0 ? correct / total : 0;
      const coinsEarned = ratio === 1 ? 30 : ratio >= 0.6 ? 15 : 5;
      const xpEarned = ratio >= 0.6 ? 20 : 8;
      const outcome = applyActivityReward(rewardsRef.current, {
        coinsEarned,
        xpEarned,
        taskKey: 'challenge'
      });
      persist(outcome.nextState);
      return outcome;
    },
    [persist]
  );

  const recordEssay = useCallback(
    (promptId: string): ActivityRewardOutcome | null => {
      const today = getLocalDateStr();
      const cur = normalizeForToday(rewardsRef.current, today);
      if (cur.essayAwardedDates[promptId] === today) return null;
      const outcome = applyActivityReward(cur, {
        coinsEarned: 20,
        xpEarned: 20,
        taskKey: 'challenge',
        today
      });
      const next: RewardsState = {
        ...outcome.nextState,
        essayAwardedDates: { ...outcome.nextState.essayAwardedDates, [promptId]: today }
      };
      persist(next);
      return { ...outcome, nextState: next };
    },
    [persist]
  );

  const setActiveTitle = useCallback(
    (titleId: string) => {
      const unlocked = getUnlockedTitles(rewardsRef.current.xp);
      if (!unlocked.some((t) => t.id === titleId)) return;
      persist({ ...rewardsRef.current, activeTitleId: titleId, updatedAt: Date.now() });
    },
    [persist]
  );

  const requestRedemption = useCallback(
    (wish: WishItem): boolean => {
      const cur = rewardsRef.current;
      if (cur.coins < wish.cost) return false;
      const req = {
        id: `red_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        wishId: wish.id,
        title: wish.title,
        cost: wish.cost,
        emoji: wish.emoji,
        status: 'pending' as const,
        requestedAt: Date.now()
      };
      persist({
        ...cur,
        coins: cur.coins - wish.cost,
        redemptions: [req, ...cur.redemptions].slice(0, 30),
        updatedAt: Date.now()
      });
      return true;
    },
    [persist]
  );

  const resolveRedemption = useCallback(
    (redemptionId: string, approve: boolean) => {
      const cur = rewardsRef.current;
      const target = cur.redemptions.find((r) => r.id === redemptionId && r.status === 'pending');
      if (!target) return;
      const nextCoins = approve ? cur.coins : cur.coins + target.cost;
      const nextRedemptions = cur.redemptions.map((r) =>
        r.id === redemptionId
          ? { ...r, status: approve ? ('approved' as const) : ('rejected' as const), resolvedAt: Date.now() }
          : r
      );
      persist({
        ...cur,
        coins: nextCoins,
        redemptions: nextRedemptions,
        updatedAt: Date.now()
      });
    },
    [persist]
  );

  const addWish = useCallback(
    (wish: Omit<WishItem, 'id'>) => {
      const cur = rewardsRef.current;
      const nextWish: WishItem = {
        ...wish,
        id: `wish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      };
      persist({
        ...cur,
        wishes: [...cur.wishes, nextWish],
        updatedAt: Date.now()
      });
    },
    [persist]
  );

  const removeWish = useCallback(
    (wishId: string) => {
      const cur = rewardsRef.current;
      persist({
        ...cur,
        wishes: cur.wishes.filter((w) => w.id !== wishId),
        updatedAt: Date.now()
      });
    },
    [persist]
  );

  return (
    <RewardsContext.Provider
      value={{
        rewards,
        recordPractice,
        recordWordsmith,
        recordMathGenius,
        recordEssay,
        setActiveTitle,
        requestRedemption,
        resolveRedemption,
        addWish,
        removeWish
      }}
    >
      {children}
    </RewardsContext.Provider>
  );
}

export function useRewards(): RewardsContextValue {
  const ctx = useContext(RewardsContext);
  if (!ctx) {
    throw new Error('useRewards must be used within a RewardsProvider');
  }
  return ctx;
}
