import React, { useMemo, useState } from 'react';
import { AlertTriangle, BookX, Check, ClipboardCopy } from 'lucide-react';
import { SUBJECTS, SubjectId } from '../data/k12Subjects';
import {
  type DailyMistakeEntry,
  type MistakeSubjectFilter,
  collectDailyMistakes,
  formatMistakesAsMarkdown,
} from './dailyMistakes';
import { getLocalDateStr } from './rewards';
import type { StudentActivityRecord } from './studentProgress';
import { THEME } from './ui';

interface Props {
  activities: readonly StudentActivityRecord[];
  studentName: string;
  extraLocalMistakes?: readonly DailyMistakeEntry[];
  heading?: string;
  showAbortedAlert?: boolean;
}

function formatTimeOnly(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDateOptionLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return `今天 (${dateKey})`;
  const d = new Date();
  d.setDate(d.getDate() - 1);
  if (dateKey === getLocalDateStr(d)) return `昨天 (${dateKey})`;
  return dateKey;
}

function getSubjectBadgeMeta(subjectId: SubjectId, isAdventure: boolean): {
  emoji: string;
  label: string;
  badgeClass: string;
} {
  if (isAdventure) {
    return { emoji: '🏛️', label: '中华闯关', badgeClass: 'bg-amber-100 text-amber-900' };
  }
  const subj = SUBJECTS.find((s) => s.id === subjectId);
  const theme = THEME[subjectId];
  return {
    emoji: subj?.emoji || '📘',
    label: subj?.name || subjectId,
    badgeClass: theme ? `${theme.soft} ${theme.text}` : 'bg-slate-100 text-slate-900',
  };
}

export default function DailyMistakesPanel({
  activities,
  studentName,
  extraLocalMistakes,
  heading = '今日错题本',
  showAbortedAlert = true,
}: Props) {
  const todayKey = getLocalDateStr();
  const [rangeMode, setRangeMode] = useState<'date' | 'last7days'>('date');
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [subjectFilter, setSubjectFilter] = useState<MistakeSubjectFilter>('all');
  const [copied, setCopied] = useState(false);

  const collection = useMemo(
    () =>
      collectDailyMistakes(activities, {
        mode: rangeMode,
        dateKey: selectedDate,
        subjectFilter,
        extraEntries: extraLocalMistakes,
      }),
    [activities, rangeMode, selectedDate, subjectFilter, extraLocalMistakes]
  );

  const rangeLabel =
    rangeMode === 'last7days'
      ? '近 7 天'
      : selectedDate === todayKey
        ? `今日 ${todayKey}`
        : selectedDate;

  const handleCopy = async () => {
    try {
      const md = formatMistakesAsMarkdown(collection, studentName || '同学', rangeLabel);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard failures in restricted contexts
    }
  };

  return (
    <section aria-label={heading} className="chunky bg-rose-50/70 p-5 mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <BookX className="w-6 h-6 text-rose-600 shrink-0" aria-hidden="true" />
            <span>{heading}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full border-2 border-ink bg-white font-black">
              {collection.uniqueWrongCount} 道错题
            </span>
          </h2>
          <p className="text-xs sm:text-sm font-bold text-slate-600 mt-1">
            作答即实时收集当日每一道做错的题（含做错后中途退出的测试），便于当天集中订正复盘
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 border-ink bg-white hover:bg-yellow-100 text-xs font-black shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" /> 已复制错题清单
            </>
          ) : (
            <>
              <ClipboardCopy className="w-3.5 h-3.5" aria-hidden="true" /> 复制错题清单
            </>
          )}
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <span className="px-3 py-1 rounded-full border-2 border-ink bg-white text-xs font-extrabold">
          已作答 {collection.answeredQuestionCount} 题
        </span>
        <span className="px-3 py-1 rounded-full border-2 border-ink bg-rose-200 text-xs font-black text-rose-950">
          收集错题 {collection.uniqueWrongCount} 道（累计错答 {collection.totalWrongInstances} 次）
        </span>
        {showAbortedAlert && collection.abortedSessionCount > 0 && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 border-ink bg-amber-200 text-xs font-black text-amber-950">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-700 shrink-0" aria-hidden="true" />
            发现 {collection.abortedSessionCount} 次中途退出未完赛测试
          </span>
        )}
      </div>

      {/* Date Range & Subject Filters */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button
          type="button"
          aria-pressed={rangeMode === 'date' && selectedDate === todayKey}
          onClick={() => {
            setRangeMode('date');
            setSelectedDate(todayKey);
          }}
          className={`px-3 py-1 rounded-full border-2 border-ink text-xs font-black transition-colors ${
            rangeMode === 'date' && selectedDate === todayKey
              ? 'bg-yellow-300'
              : 'bg-white hover:bg-yellow-50'
          }`}
        >
          今天
        </button>
        <button
          type="button"
          aria-pressed={rangeMode === 'last7days'}
          onClick={() => setRangeMode('last7days')}
          className={`px-3 py-1 rounded-full border-2 border-ink text-xs font-black transition-colors ${
            rangeMode === 'last7days' ? 'bg-yellow-300' : 'bg-white hover:bg-yellow-50'
          }`}
        >
          近 7 天
        </button>
        {collection.availableDates.length > 1 && (
          <label className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
            <span>按日期：</span>
            <select
              value={rangeMode === 'date' ? selectedDate : ''}
              onChange={(e) => {
                if (!e.target.value) return;
                setRangeMode('date');
                setSelectedDate(e.target.value);
              }}
              className="px-2.5 py-1 rounded-full border-2 border-ink bg-white text-xs font-black"
            >
              {rangeMode === 'last7days' && <option value="">选择单日…</option>}
              {collection.availableDates.map((dk) => (
                <option key={dk} value={dk}>
                  {formatDateOptionLabel(dk, todayKey)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div role="group" aria-label="按学科筛选错题" className="flex flex-wrap gap-1.5 mt-2.5">
        <button
          type="button"
          aria-pressed={subjectFilter === 'all'}
          onClick={() => setSubjectFilter('all')}
          className={`px-2.5 py-1 rounded-full border-2 border-ink text-xs font-black transition-colors ${
            subjectFilter === 'all' ? 'bg-ink text-white' : 'bg-white hover:bg-slate-100'
          }`}
        >
          全部学科
        </button>
        {SUBJECTS.map((s) => {
          const active = subjectFilter === s.id;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSubjectFilter((prev) => (prev === s.id ? 'all' : s.id))}
              className={`px-2.5 py-1 rounded-full border-2 border-ink text-xs font-black transition-colors ${
                active ? THEME[s.id].solid : 'bg-white hover:bg-yellow-50'
              }`}
            >
              {s.emoji} {s.name}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={subjectFilter === 'adventure'}
          onClick={() => setSubjectFilter((prev) => (prev === 'adventure' ? 'all' : 'adventure'))}
          className={`px-2.5 py-1 rounded-full border-2 border-ink text-xs font-black transition-colors ${
            subjectFilter === 'adventure' ? 'bg-amber-300' : 'bg-white hover:bg-amber-50'
          }`}
        >
          🏛️ 中华闯关
        </button>
      </div>

      {/* Mistakes List */}
      {collection.mistakes.length === 0 ? (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/80 p-5 text-center font-bold text-emerald-900">
          🎉 {rangeLabel} 暂未收集到错题，继续保持认真作答！
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {collection.mistakes.map((m, idx) => {
            const subjMeta = getSubjectBadgeMeta(m.subjectId, m.activityType === 'humanity');
            return (
              <li key={m.key} className="rounded-2xl border-2 border-ink bg-white p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-black text-slate-500 tabular-nums">
                      #{idx + 1}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full border border-ink font-black ${subjMeta.badgeClass}`}
                    >
                      {subjMeta.emoji} {subjMeta.label}
                    </span>
                    {m.category && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-300 bg-slate-50 font-bold text-slate-700">
                        {m.category}
                      </span>
                    )}
                    {m.isIncompleteSession && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border border-rose-400 bg-rose-100 font-black text-rose-900">
                        ⚠️ 来自中途退出测试
                      </span>
                    )}
                    {m.wrongCount > 1 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border border-amber-500 bg-amber-100 font-black text-amber-950">
                        错答 {m.wrongCount} 次
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                    {m.dateKey} {formatTimeOnly(m.timestamp)}
                  </span>
                </div>

                <p className="font-bold text-sm sm:text-base text-ink whitespace-pre-line break-words">
                  {m.question}
                </p>

                {m.kind === 'wordsmith' ? (
                  <div className="space-y-1.5 text-xs">
                    <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 font-bold text-rose-950">
                      孩子造句（{m.wordScore ?? 0}/5 星）：{m.userAnswer}
                    </div>
                    {m.wordCorrection && (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 font-bold text-emerald-950">
                        建议表达：{m.wordCorrection}
                      </div>
                    )}
                    {m.wordFeedback && (
                      <p className="text-slate-600 font-semibold">{m.wordFeedback}</p>
                    )}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 font-bold text-rose-950">
                      孩子错答：{m.previousWrongAnswers.join(' / ') || m.userAnswer}
                    </div>
                    {m.correctAnswer && (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 font-black text-emerald-950">
                        正确答案：{m.correctAnswer}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
