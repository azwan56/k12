import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import {
  Subject,
  GradeLevel,
  PracticeDifficulty,
  PRACTICE_DIFFICULTY_META,
} from '../data/k12Subjects';
import { THEME, replaceQuery } from './ui';

export type DifficultyFilter = 'all' | PracticeDifficulty;

export function parseDifficultyFilter(val?: string | null): DifficultyFilter {
  if (val === 'foundation' || val === 'standard' || val === 'challenge') {
    return val;
  }
  return 'all';
}

interface Props {
  subject: Subject;
  grade: GradeLevel;
  initialTrack: string | null;
  initialDifficulty?: string | null;
}

export function BackLink({ href, label = '返回' }: { href: string; label?: string }) {
  return (
    <a href={href} className="inline-flex items-center gap-1.5 font-extrabold text-slate-600 hover:text-ink rounded-lg mt-2">
      <ArrowLeft className="w-5 h-5" aria-hidden="true" />
      {label}
    </a>
  );
}

export default function SubjectPage({ subject, grade, initialTrack, initialDifficulty }: Props) {
  const theme = THEME[subject.id];
  const tracks = subject.tracks?.[grade] ?? [];

  const pickTrack = (id: string | null) =>
    tracks.find((t) => t.id === id)?.id ?? tracks[0]?.id ?? null;
  const [trackId, setTrackId] = useState<string | null>(() => pickTrack(initialTrack));
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(() =>
    parseDifficultyFilter(initialDifficulty)
  );

  // Grade switch may change the available tracks.
  useEffect(() => {
    setTrackId((cur) => pickTrack(cur));
  }, [grade]);

  const syncQuery = (nextTrack: string | null, nextDiff: DifficultyFilter) => {
    const params: Record<string, string> = {};
    if (nextTrack) params.t = nextTrack;
    if (nextDiff !== 'all') params.d = nextDiff;
    replaceQuery(['s', subject.id], params);
  };

  const selectTrack = (id: string) => {
    setTrackId(id);
    syncQuery(id, difficulty);
  };

  const selectDifficulty = (nextDiff: DifficultyFilter) => {
    setDifficulty(nextDiff);
    syncQuery(trackId, nextDiff);
  };

  const track = tracks.find((t) => t.id === trackId);
  const topics = track ? track.topics : subject.topics[grade];

  const poolQuestions = subject.questions.filter(
    (q) => q.grade === grade && (!track || q.track === track.id)
  );
  const hasDifficultyTiers = poolQuestions.some((q) => Boolean(q.difficulty));
  const tierCounts: Record<PracticeDifficulty, number> = {
    foundation: poolQuestions.filter((q) => q.difficulty === 'foundation').length,
    standard: poolQuestions.filter((q) => q.difficulty === 'standard').length,
    challenge: poolQuestions.filter((q) => q.difficulty === 'challenge').length,
  };

  const practiceParams = new URLSearchParams();
  if (track) practiceParams.set('t', track.id);
  if (hasDifficultyTiers && difficulty !== 'all') practiceParams.set('d', difficulty);
  const practiceQs = practiceParams.toString();
  const practiceHref = `#/s/${subject.id}/practice${practiceQs ? `?${practiceQs}` : ''}`;

  return (
    <>
      <BackLink href="#/" />

      <div className="flex items-center gap-4 mt-6">
        <span
          className={`${theme.solid} w-20 h-20 shrink-0 rounded-3xl border-[3px] border-ink grid place-items-center text-4xl`}
          aria-hidden="true"
        >
          {subject.emoji}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-4xl font-black">{subject.name}</h1>
            {poolQuestions.length > 0 && (
              <span className="px-3 py-1 rounded-full border-2 border-ink bg-yellow-100 text-xs font-black tabular-nums">
                📚 {track ? `当前单元题库 ${poolQuestions.length} 题` : `本年级题库共 ${poolQuestions.length} 题`} · 每次动态出新题 · 逐题实时记录
              </span>
            )}
          </div>
          <p className={`font-bold mt-0.5 ${theme.text}`}>{subject.short[grade]}</p>
        </div>
      </div>

      {/* English: two main tools */}
      {subject.id === 'english' && (
        <div className="grid sm:grid-cols-2 gap-5 mt-8">
          <a href="#/s/english/wordsmith" className="chunky bg-white p-6 block">
            <span className="text-4xl" aria-hidden="true">✍️</span>
            <span className="flex items-center gap-2 text-2xl font-black mt-3">
              Wordsmith 造句 <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </span>
          </a>
          <a href="#/s/english/essay" className="chunky bg-white p-6 block">
            <span className="text-4xl" aria-hidden="true">📝</span>
            <span className="flex items-center gap-2 text-2xl font-black mt-3">
              命题作文 <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </span>
          </a>
        </div>
      )}

      {/* IG Math: adaptive MathGenius quiz & Grade 6 Comprehensive Exam */}
      {subject.id === 'ig-math' && (
        <div className={grade === 'G6' ? 'grid sm:grid-cols-2 gap-4 mt-8' : 'mt-8'}>
          <a href="#/s/ig-math/mathgenius" className="chunky bg-white p-5 flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">🚀</span>
            <span className="flex-1 min-w-0">
              <span className="block text-xl font-black">MathGenius 闯关</span>
              <span className="block text-xs font-bold text-slate-600 mt-0.5">AI 自适应分级数学挑战</span>
            </span>
            <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
          </a>
          {grade === 'G6' && (
            <a href="#/s/ig-math/g6-exam" className="chunky bg-sky-50 p-5 flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">📝</span>
              <span className="flex-1 min-w-0">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xl font-black">六年级综合练习卷</span>
                  <span className="px-2 py-0.5 rounded-full border border-ink bg-yellow-300 text-[11px] font-black">
                    20+10 题
                  </span>
                </span>
                <span className="block text-xs font-bold text-slate-700 mt-0.5">
                  角与直线 · 方程 · 不等式 · 比例尺 · 单利（＜80% 自动加练 10 题）
                </span>
              </span>
              <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      {/* Sub-tracks */}
      {tracks.length > 0 && (
        <div role="group" aria-label="选择分科" className="flex flex-wrap gap-3 mt-8">
          {tracks.map((t) => {
            const active = t.id === trackId;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => selectTrack(t.id)}
                className={`px-5 py-2.5 rounded-full border-[3px] border-ink font-extrabold text-lg transition-colors ${
                  active ? `${theme.solid} shadow-[3px_3px_0_var(--color-ink)]` : 'bg-white hover:bg-yellow-50'
                }`}
              >
                <span aria-hidden="true">{t.emoji}</span> {t.name} · {t.nameZh}
              </button>
            );
          })}
        </div>
      )}

      {/* Difficulty Tier Selector */}
      {hasDifficultyTiers && (
        <div className="mt-8">
          <p className="text-sm font-black text-slate-600 mb-2.5">选择难度梯度</p>
          <div role="group" aria-label="选择难度梯度" className="flex flex-wrap gap-2.5">
            <button
              type="button"
              aria-pressed={difficulty === 'all'}
              onClick={() => selectDifficulty('all')}
              className={`px-4 py-2 rounded-2xl border-[3px] border-ink font-extrabold text-sm sm:text-base transition-colors ${
                difficulty === 'all'
                  ? 'bg-yellow-300 shadow-[3px_3px_0_var(--color-ink)]'
                  : 'bg-white hover:bg-yellow-50'
              }`}
            >
              🎯 智能混合（{poolQuestions.length} 题 · 循序渐进）
            </button>
            {(['foundation', 'standard', 'challenge'] as PracticeDifficulty[]).map((tier) => {
              const meta = PRACTICE_DIFFICULTY_META[tier];
              const active = difficulty === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectDifficulty(tier)}
                  className={`px-4 py-2 rounded-2xl border-[3px] border-ink font-extrabold text-sm sm:text-base transition-colors ${
                    active
                      ? `${meta.badgeClass} shadow-[3px_3px_0_var(--color-ink)]`
                      : 'bg-white hover:bg-yellow-50'
                  }`}
                >
                  {meta.emoji} {meta.label}（{tierCounts[tier]} 题）
                </button>
              );
            })}
          </div>
          <p className="text-xs font-bold text-slate-600 mt-2">
            {difficulty === 'all'
              ? '每组自动按“3 道基础 → 3 道进阶 → 2 道培优挑战”渐进抽题，优先抽取未做过的新题。'
              : PRACTICE_DIFFICULTY_META[difficulty].desc}
          </p>
        </div>
      )}

      {/* Topics */}
      {topics.length > 0 && (
        <ul className="flex flex-wrap gap-2.5 mt-6" aria-label="本单元知识点">
          {topics.map((t) => (
            <li key={t} className={`${theme.soft} px-4 py-2 rounded-2xl font-bold`}>
              {t}
            </li>
          ))}
        </ul>
      )}

      <a
        href={practiceHref}
        className="chunky bg-yellow-300 mt-10 flex items-center justify-center gap-3 py-5 text-2xl font-black"
      >
        <Play className="w-7 h-7 fill-current" aria-hidden="true" />
        开始练习
      </a>
    </>
  );
}
