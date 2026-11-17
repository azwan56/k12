import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { ESSAY_PROMPTS, GradeLevel, gradeLabel } from '../data/k12Subjects';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useRewards } from '../hooks/useRewards';
import ReportActions from './ReportActions';
import type { ActivityRewardOutcome } from './rewards';
import RewardBanner from './RewardBanner';
import { recordStudentActivity } from './studentProgressService';
import { BackLink } from './SubjectPage';

export default function EssayPage({ grade }: { grade: GradeLevel }) {
  const prompts = useMemo(() => ESSAY_PROMPTS.filter((p) => p.grade === grade), [grade]);
  const [promptId, setPromptId] = useState(prompts[0].id);
  const prompt = prompts.find((p) => p.id === promptId) ?? prompts[0];

  const [draft, setDraft] = useState('');
  const [done, setDone] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [rewardOutcome, setRewardOutcome] = useState<ActivityRewardOutcome | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { profile, resolvedName, effectiveAvatarId } = useProfile();
  const { rewards, recordEssay } = useRewards();

  useEffect(() => {
    if (!prompts.some((p) => p.id === promptId)) setPromptId(prompts[0].id);
  }, [prompts, promptId]);

  useEffect(() => {
    setDraft(localStorage.getItem(`k12_essay_${prompt.id}`) ?? '');
    setDone(false);
    setRewardOutcome(null);
  }, [prompt.id]);

  const update = (value: string) => {
    setDraft(value);
    setDone(false);
    localStorage.setItem(`k12_essay_${prompt.id}`, value);
  };

  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const [min, max] = prompt.words;
  const inRange = words >= min && words <= max;

  return (
    <>
      <BackLink href="#/s/english" />
      <h1 className="text-4xl font-black mt-6">
        命题作文 <span aria-hidden="true">📝</span>
      </h1>

      <div role="group" aria-label="选择题目" className="flex flex-wrap gap-2.5 mt-6">
        {prompts.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === prompt.id}
            onClick={() => setPromptId(p.id)}
            className={`px-4 py-2 rounded-full border-[3px] border-ink font-extrabold text-sm transition-colors ${
              p.id === prompt.id ? 'bg-rose-300 shadow-[3px_3px_0_var(--color-ink)]' : 'bg-white hover:bg-yellow-50'
            }`}
          >
            {p.genre} · {p.title}
          </button>
        ))}
      </div>

      <div className="chunky bg-rose-100 p-6 mt-6">
        <h2 className="text-2xl font-black">{prompt.title}</h2>
        <p className="text-lg font-semibold mt-2">{prompt.prompt}</p>
        <details className="mt-4">
          <summary className="font-extrabold cursor-pointer w-fit">💡 小贴士</summary>
          <ul className="mt-2 space-y-1 font-semibold text-slate-700 list-disc pl-6">
            {prompt.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
      </div>

      <label htmlFor="essay" className="sr-only">作文正文</label>
      <textarea
        id="essay"
        rows={10}
        value={draft}
        onChange={(e) => update(e.target.value)}
        placeholder="Start writing here…"
        className="w-full mt-6 p-5 rounded-3xl border-[3px] border-ink bg-white text-lg leading-relaxed resize-y outline-none focus-visible:outline-[3px] focus-visible:outline-blue-600"
      />

      <div className="flex items-center justify-between gap-4 mt-4">
        <span
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-[3px] border-ink font-extrabold ${
            inRange ? 'bg-emerald-200' : 'bg-white'
          }`}
        >
          {inRange && <Check className="w-4 h-4" aria-hidden="true" />}
          {words} 词 <span className="text-slate-500 font-bold">/ {min}–{max}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setDone(true);
            setSubmissionCount((c) => c + 1);
            const outcome = words >= min ? recordEssay(prompt.id) : null;
            if (outcome) setRewardOutcome(outcome);
            if (user && draft.trim().length > 0) {
              void recordStudentActivity(
                user,
                {
                  profile,
                  resolvedName,
                  effectiveAvatarId,
                  rewards: outcome ? outcome.nextState : rewards,
                },
                {
                  type: 'essay',
                  subjectId: 'english',
                  title: `命题作文 · ${prompt.genre}《${prompt.title}》`,
                  grade,
                  score: words,
                  maxScore: min,
                  accuracyPct: Math.min(100, Math.round((words / min) * 100)),
                  summary: `完成作文《${prompt.title}》，共 ${words} 词（建议 ${min}–${max} 词）`,
                  essayContent: draft.trim().slice(0, 4000),
                }
              ).catch((err) => {
                console.warn('[EssayPage] Failed to record activity:', err);
              });
            }
          }}
          disabled={words === 0}
          className="chunky bg-yellow-300 px-6 py-3 text-lg font-black disabled:opacity-40"
        >
          写完了
        </button>
      </div>

      <div aria-live="polite">
        {done && (
          <>
            <div ref={reportRef} className="mt-6 bg-white rounded-3xl border-[3px] border-ink p-6">
              <div className="text-center">
                <p className="font-extrabold text-rose-800">
                  英语命题作文 · {prompt.genre} · {gradeLabel(grade)} · {resolvedName || user?.displayName || '同学'}
                </p>
                <h2 className="text-2xl sm:text-3xl font-black mt-1">《{prompt.title}》</h2>
                <p className="text-sm font-extrabold text-slate-600 mt-2">
                  已完成 {words} 词（建议 {min}–{max} 词） ·{' '}
                  {words < min
                    ? '再多写一点，加个例子吧 ✏️'
                    : words > max
                      ? '有点长啦，试试删掉重复的句子 ✂️'
                      : '字数刚刚好，真棒！🎉'}
                </p>
              </div>
              <div className="mt-5 rounded-2xl bg-rose-50 border-2 border-ink/20 p-4">
                <p className="font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed break-words">
                  {draft.trim()}
                </p>
              </div>
              <p className="text-center text-xs font-extrabold text-slate-500 mt-5 tracking-widest">
                K12.VANPOWER.LIVE
              </p>
            </div>
            <RewardBanner outcome={rewardOutcome} />
            <ReportActions
              reportRef={reportRef}
              subjectLabel={`命题作文 · ${prompt.genre}《${prompt.title}》`}
              scoreSummary={`${words} 词（目标 ${min}–${max} 词）`}
              filePrefix="K12-Essay"
              sessionKey={`essay-${prompt.id}-${submissionCount}`}
              autoSend={words >= min}
            />
          </>
        )}
      </div>
    </>
  );
}
