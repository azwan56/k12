import React, { useMemo, useState } from 'react';
import { ArrowRight, BookX, Check, Gift, Shield, Flame } from 'lucide-react';
import { SUBJECTS, GradeLevel, gradeLabel } from '../data/k12Subjects';
import { useAuth } from '../hooks/useAuth';
import { useRewards } from '../hooks/useRewards';
import { loadLocalDailyMistakes } from './dailyMistakes';
import { DAILY_GOAL_TARGET, DailyTaskKey, countCompletedDailyTasks, getLocalDateStr } from './rewards';
import { THEME } from './ui';

const DAILY_QUESTS: { key: DailyTaskKey; label: string; hint: string }[] = [
  { key: 'practice', label: '完成 1 轮学科练习', hint: '正确率 ≥ 70%' },
  { key: 'wordsmith', label: 'Wordsmith 造句 1 组', hint: 'English 内进入' },
  { key: 'challenge', label: 'MathGenius 闯关或命题作文', hint: '任选 1 项完成' }
];

export default function HomePage({ grade }: { grade: GradeLevel }) {
  const { user } = useAuth();
  const { rewards, requestRedemption } = useRewards();
  const [redeemNotice, setRedeemNotice] = useState<string | null>(null);
  const todayLocalMistakeCount = useMemo(() => {
    const todayKey = getLocalDateStr();
    const list = loadLocalDailyMistakes(user?.uid ?? null, todayKey);
    return new Set(list.map((m) => m.key)).size;
  }, [user?.uid]);

  const completedCount = countCompletedDailyTasks(rewards.daily);
  const progressPct = Math.min(100, Math.round((completedCount / DAILY_GOAL_TARGET) * 100));

  // Pick the nearest affordable or next wish for the progress bar
  const sortedWishes = [...rewards.wishes].sort((a, b) => a.cost - b.cost);
  const nextWish = sortedWishes.find((w) => rewards.coins < w.cost) ?? sortedWishes[sortedWishes.length - 1];
  const wishPct =
    nextWish && nextWish.cost > 0 ? Math.min(100, Math.round((rewards.coins / nextWish.cost) * 100)) : 100;

  const handleRedeem = (wishId: string) => {
    const wish = rewards.wishes.find((w) => w.id === wishId);
    if (!wish) return;
    if (requestRedemption(wish)) {
      setRedeemNotice(`已申请兑换「${wish.emoji} ${wish.title}」，请家长在右上角设置中确认核销！`);
      setTimeout(() => setRedeemNotice(null), 5000);
    }
  };

  return (
    <>
      <h1 className="text-4xl sm:text-5xl font-black leading-tight mt-4">
        今天学点什么？<span aria-hidden="true">👋</span>
      </h1>
      <p className="mt-2 text-lg font-bold text-slate-600">{gradeLabel(grade)} · 选一门课</p>

      {/* 今日学习能量条 */}
      <section aria-label="今日学习能量条" className="chunky bg-amber-100 p-5 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">⚡</span>
            <h2 className="text-xl font-black">今日学习能量条</h2>
          </div>
          <div className="flex items-center gap-2 text-sm font-black">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-2 border-ink bg-white">
              <Flame className="w-4 h-4 text-orange-500" aria-hidden="true" />
              连胜 {rewards.streak.current} 天
            </span>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-2 border-ink bg-sky-100"
              title="每周累计打卡满 5 天自动送 1 张护盾卡，漏打卡时自动保住连胜"
            >
              <Shield className="w-4 h-4 text-sky-700" aria-hidden="true" />
              护盾 {rewards.streak.freezes}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 mb-1">
            <span>
              {rewards.daily.goalAwarded
                ? '🎉 今日达标！已获得 +20 能量币加成'
                : `完成任意 ${DAILY_GOAL_TARGET} 项即算今日达标（${completedCount}/${DAILY_GOAL_TARGET}）`}
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-3.5 w-full rounded-full border-2 border-ink bg-white overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
          {DAILY_QUESTS.map((q) => {
            const done = rewards.daily.tasks[q.key];
            return (
              <li
                key={q.key}
                className={`flex items-start gap-2.5 px-3 py-2.5 rounded-2xl border-2 border-ink ${
                  done ? 'bg-emerald-200' : 'bg-white'
                }`}
              >
                <span
                  className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 border-ink grid place-items-center ${
                    done ? 'bg-ink text-white' : 'bg-white'
                  }`}
                  aria-hidden="true"
                >
                  {done && <Check className="w-3 h-3" />}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-black ${done ? 'line-through text-slate-600' : ''}`}>
                    {q.label}
                  </span>
                  <span className="block text-xs font-bold text-slate-500">{q.hint}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 今日错题本入口 */}
      <a href="#/mistakes" className="chunky bg-rose-50 p-4 mt-4 flex items-center gap-3.5">
        <span
          className="bg-rose-200 w-12 h-12 shrink-0 rounded-2xl border-[3px] border-ink grid place-items-center"
          aria-hidden="true"
        >
          <BookX className="w-6 h-6 text-rose-900" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-black">今日错题本</span>
            {todayLocalMistakeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full border-2 border-ink bg-rose-200 text-[11px] font-black text-rose-950">
                今日 {todayLocalMistakeCount} 题待订正
              </span>
            )}
          </span>
          <span className="block text-xs font-bold text-slate-600">
            系统自动收集当天所有做错的题目，方便随时复盘巩固
          </span>
        </span>
        <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
      </a>

      {/* 科目卡片 */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
        {SUBJECTS.map((s, i) => (
          <li key={s.id} className={i === 0 ? 'sm:col-span-2' : ''}>
            <a
              href={`#/s/${s.id}`}
              className={`chunky ${THEME[s.id].soft} flex items-center gap-4 p-5 h-full`}
            >
              <span
                className={`${THEME[s.id].solid} w-16 h-16 shrink-0 rounded-2xl border-[3px] border-ink grid place-items-center text-3xl`}
                aria-hidden="true"
              >
                {s.emoji}
              </span>
              <span>
                <span className="block text-2xl font-black">{s.name}</span>
                <span className={`block font-bold ${THEME[s.id].text}`}>{s.short[grade]}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      {/* 课外拓展挑战（与校内世界人文学科独立计分） */}
      <section aria-label="课外拓展挑战" className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 className="text-xl font-black">课外拓展挑战</h2>
          <span className="text-xs font-extrabold text-slate-500">独立拓展模块 · 与校内学科分开统计</span>
        </div>
        <a href="#/adventure" className="chunky bg-amber-50 p-5 flex items-center gap-4">
          <span
            className="bg-amber-300 w-14 h-14 shrink-0 rounded-2xl border-[3px] border-ink grid place-items-center text-2xl"
            aria-hidden="true"
          >
            🏛️
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xl font-black">中华历史地理大闯关</span>
            <span className="block text-sm font-bold text-amber-900">
              三季 30 关 · 300 题中华文史地理趣味闯关（独立课外模块）
            </span>
          </span>
          <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
        </a>
      </section>

      {/* 心愿兑换商店 */}
      {rewards.wishes.length > 0 && (
        <section aria-label="心愿兑换商店" className="chunky bg-white p-5 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Gift className="w-6 h-6 text-rose-600" aria-hidden="true" />
              <h2 className="text-xl font-black">心愿兑换商店</h2>
            </div>
            <span className="px-3 py-1 rounded-full border-2 border-ink bg-yellow-200 text-sm font-black">
              🪙 {rewards.coins} 能量币
            </span>
          </div>

          {nextWish && (
            <div className="mt-3 p-3 rounded-2xl bg-rose-50 border-2 border-ink">
              <div className="flex items-center justify-between text-xs font-extrabold text-rose-900 mb-1">
                <span>
                  {rewards.coins >= nextWish.cost
                    ? `🎉 已攒够兑换「${nextWish.emoji} ${nextWish.title}」！`
                    : `距离【${nextWish.emoji} ${nextWish.title}】还差 ${nextWish.cost - rewards.coins} 币`}
                </span>
                <span>{wishPct}%</span>
              </div>
              <div className="h-3 w-full rounded-full border-2 border-ink bg-white overflow-hidden">
                <div
                  className="h-full bg-rose-400 transition-all duration-300"
                  style={{ width: `${wishPct}%` }}
                />
              </div>
            </div>
          )}

          {redeemNotice && (
            <p className="mt-3 px-4 py-2.5 rounded-2xl bg-emerald-100 border-2 border-ink text-sm font-black text-emerald-900" role="status">
              {redeemNotice}
            </p>
          )}

          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {rewards.wishes.map((w) => {
              const canAfford = rewards.coins >= w.cost;
              return (
                <li key={w.id} className="flex flex-col justify-between p-3.5 rounded-2xl border-2 border-ink bg-cream">
                  <div>
                    <span className="text-3xl" aria-hidden="true">{w.emoji}</span>
                    <p className="font-black mt-1 text-base">{w.title}</p>
                    <p className="text-xs font-extrabold text-amber-800 mt-0.5">🪙 {w.cost} 能量币</p>
                  </div>
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => handleRedeem(w.id)}
                    className={`mt-3 w-full py-2 rounded-xl border-2 border-ink text-sm font-black transition-colors ${
                      canAfford
                        ? 'bg-yellow-300 hover:bg-yellow-400'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? '申请兑换' : `还差 ${w.cost - rewards.coins} 币`}
                  </button>
                </li>
              );
            })}
          </ul>

          {rewards.redemptions.length > 0 && (
            <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-200">
              <p className="text-xs font-black text-slate-500 mb-2">最近兑换记录</p>
              <ul className="flex flex-wrap gap-2">
                {rewards.redemptions.slice(0, 4).map((r) => (
                  <li
                    key={r.id}
                    className={`text-xs font-extrabold px-3 py-1 rounded-full border-2 border-ink ${
                      r.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-900'
                        : r.status === 'rejected'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {r.emoji} {r.title} ·{' '}
                    {r.status === 'approved' ? '已核销' : r.status === 'rejected' ? '已退回' : '待家长确认'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </>
  );
}
