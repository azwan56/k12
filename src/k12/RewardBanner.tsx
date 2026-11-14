import React from 'react';
import { ActivityRewardOutcome, DAILY_GOAL_TARGET, countCompletedDailyTasks } from './rewards';

export default function RewardBanner({ outcome }: { outcome: ActivityRewardOutcome | null }) {
  if (!outcome) return null;
  const completed = countCompletedDailyTasks(outcome.nextState.daily);

  return (
    <div
      className="chunky bg-amber-100 px-5 py-4 mt-5 flex flex-wrap items-center justify-between gap-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">🪙</span>
        <div>
          <p className="font-black text-lg text-ink">
            +{outcome.coinsAdded} 能量币
            {outcome.bonusCoins > 0 && (
              <span className="ml-2 text-sm font-extrabold text-amber-800">
                （含达标/里程碑加成 +{outcome.bonusCoins}）
              </span>
            )}
          </p>
          <p className="text-sm font-bold text-slate-700">
            {outcome.dailyGoalJustCompleted
              ? `🎉 今日学习目标达成！已连胜 ${outcome.nextState.streak.current} 天`
              : outcome.nextState.daily.goalAwarded
              ? `✅ 今日目标已达成（${completed}/3 项任务）`
              : `今日任务 ${Math.min(completed, DAILY_GOAL_TARGET)}/${DAILY_GOAL_TARGET} 已完成`}
          </p>
          {outcome.freezeUsed && (
            <p className="text-xs font-extrabold text-sky-800 mt-0.5">
              🛡️ 已自动消耗 1 张护盾卡，保住连胜记录！
            </p>
          )}
          {outcome.freezeEarned && (
            <p className="text-xs font-extrabold text-emerald-800 mt-0.5">
              🛡️ 累计打卡满 5 天，获得 1 张新护盾卡！
            </p>
          )}
          {outcome.milestoneReached && (
            <p className="text-xs font-extrabold text-rose-800 mt-0.5">
              🏆 达成 {outcome.milestoneReached} 天连胜里程碑！
            </p>
          )}
        </div>
      </div>
      <span className="px-3 py-1 rounded-full border-2 border-ink bg-white font-black text-sm">
        当前共 {outcome.nextState.coins} 币
      </span>
    </div>
  );
}
