import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, X, RotateCcw } from 'lucide-react';
import {
  Subject,
  GradeLevel,
  PracticeDifficulty,
  PRACTICE_DIFFICULTY_META,
  gradeLabel,
} from '../data/k12Subjects';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useRewards } from '../hooks/useRewards';
import { drawUnseenFromStorage, shuffleOptionsWithAnswer } from './questionDedupe';
import ReportActions from './ReportActions';
import type { ActivityRewardOutcome } from './rewards';
import RewardBanner from './RewardBanner';
import type { QuestionReviewItem } from './studentProgress';
import { recordStudentActivity } from './studentProgressService';
import { THEME, replaceQuery } from './ui';
import { BackLink, DifficultyFilter, parseDifficultyFilter } from './SubjectPage';

const PRACTICE_ROUND_SIZE = 8;

interface ReviewEntry extends QuestionReviewItem {
  explanation: string;
  difficulty?: PracticeDifficulty;
  topic?: string;
}

interface Props {
  subject: Subject;
  grade: GradeLevel;
  track: string | null;
  initialDifficulty?: string | null;
}

export default function PracticePage({ subject, grade, track, initialDifficulty }: Props) {
  const theme = THEME[subject.id];
  const tracks = subject.tracks?.[grade] ?? [];
  const activeTrack = tracks.find((t) => t.id === track) ?? tracks[0];

  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>(() =>
    parseDifficultyFilter(initialDifficulty)
  );
  const [round, setRound] = useState(0);
  const { user } = useAuth();
  const { profile, resolvedName, effectiveAvatarId } = useProfile();
  const { recordPractice } = useRewards();

  const basePool = useMemo(
    () =>
      subject.questions.filter(
        (q) => q.grade === grade && (!activeTrack || q.track === activeTrack.id)
      ),
    [subject, grade, activeTrack?.id]
  );

  const hasDifficultyTiers = useMemo(
    () => basePool.some((q) => Boolean(q.difficulty)),
    [basePool]
  );

  const backParams = new URLSearchParams();
  if (activeTrack) backParams.set('t', activeTrack.id);
  if (hasDifficultyTiers && difficultyFilter !== 'all') backParams.set('d', difficultyFilter);
  const backQs = backParams.toString();
  const backHref = `#/s/${subject.id}${backQs ? `?${backQs}` : ''}`;

  const switchDifficulty = (nextDiff: DifficultyFilter) => {
    setDifficultyFilter(nextDiff);
    setRound(0);
    const params: Record<string, string> = {};
    if (activeTrack) params.t = activeTrack.id;
    if (nextDiff !== 'all') params.d = nextDiff;
    replaceQuery(['s', subject.id, 'practice'], params);
  };

  // Draw unseen-first questions & shuffle option order each round so repeats and position memorization drop sharply.
  const poolDraw = useMemo(() => {
    const scope = `practice_${user?.uid || 'guest'}_${subject.id}_${grade}_${activeTrack?.id || 'main'}`;

    if (hasDifficultyTiers && difficultyFilter === 'all') {
      const fPool = basePool.filter((q) => q.difficulty === 'foundation');
      const sPool = basePool.filter((q) => q.difficulty === 'standard');
      const cPool = basePool.filter((q) => q.difficulty === 'challenge');

      if (fPool.length > 0 && sPool.length > 0 && cPool.length > 0) {
        const fDraw = drawUnseenFromStorage(`${scope}_foundation`, fPool, (item) => item.id, 3);
        const sDraw = drawUnseenFromStorage(`${scope}_standard`, sPool, (item) => item.id, 3);
        const cDraw = drawUnseenFromStorage(`${scope}_challenge`, cPool, (item) => item.id, 2);
        const combined = [...fDraw.selected, ...sDraw.selected, ...cDraw.selected];
        return {
          totalPoolSize: basePool.length,
          questions: combined.map((q) => {
            const shuffled = shuffleOptionsWithAnswer(q.options, q.answer);
            return { ...q, options: shuffled.options, answer: shuffled.answer };
          }),
        };
      }
    }

    if (hasDifficultyTiers && difficultyFilter !== 'all') {
      const tierPool = basePool.filter((q) => q.difficulty === difficultyFilter);
      const effectivePool = tierPool.length > 0 ? tierPool : basePool;
      const drawn = drawUnseenFromStorage(
        `${scope}_${difficultyFilter}`,
        effectivePool,
        (item) => item.id,
        PRACTICE_ROUND_SIZE
      );
      return {
        totalPoolSize: drawn.totalPoolSize,
        questions: drawn.selected.map((q) => {
          const shuffled = shuffleOptionsWithAnswer(q.options, q.answer);
          return { ...q, options: shuffled.options, answer: shuffled.answer };
        }),
      };
    }

    const drawn = drawUnseenFromStorage(scope, basePool, (item) => item.id, PRACTICE_ROUND_SIZE);
    return {
      totalPoolSize: drawn.totalPoolSize,
      questions: drawn.selected.map((q) => {
        const shuffled = shuffleOptionsWithAnswer(q.options, q.answer);
        return { ...q, options: shuffled.options, answer: shuffled.answer };
      }),
    };
  }, [subject, grade, activeTrack?.id, basePool, hasDifficultyTiers, difficultyFilter, round, user?.uid]);

  const questions = poolDraw.questions;

  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [rewardOutcome, setRewardOutcome] = useState<ActivityRewardOutcome | null>(null);
  const [reviewList, setReviewList] = useState<ReviewEntry[]>([]);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const awardedRef = useRef(false);
  const answersRef = useRef<QuestionReviewItem[]>([]);
  const startedAtRef = useRef(Date.now());
  const reportRef = useRef<HTMLDivElement>(null);

  const restart = () => {
    setIndex(0);
    setChosen(null);
    setScore(0);
    setRewardOutcome(null);
    setReviewList([]);
    setDurationSec(null);
    awardedRef.current = false;
    answersRef.current = [];
    startedAtRef.current = Date.now();
  };

  useEffect(restart, [questions]);

  const finished = questions.length > 0 && index >= questions.length;
  const difficultySummaryLabel = hasDifficultyTiers
    ? difficultyFilter === 'all'
      ? '智能混合'
      : PRACTICE_DIFFICULTY_META[difficultyFilter].label
    : null;

  useEffect(() => {
    if (finished && !awardedRef.current) {
      awardedRef.current = true;
      const outcome = recordPractice(score, questions.length);
      setRewardOutcome(outcome);
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      setDurationSec(elapsedSec);
      if (user) {
        const accuracyPct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
        const trackTitle = activeTrack ? ` · ${activeTrack.nameZh}` : '';
        const diffTitle = difficultySummaryLabel ? ` · ${difficultySummaryLabel}` : '';
        void recordStudentActivity(
          user,
          { profile, resolvedName, effectiveAvatarId, rewards: outcome.nextState },
          {
            type: 'practice',
            subjectId: subject.id,
            title: `${subject.name}${trackTitle} · ${gradeLabel(grade)}${diffTitle}练习`,
            grade,
            score,
            maxScore: questions.length,
            accuracyPct,
            durationSec: elapsedSec,
            difficulty: hasDifficultyTiers
              ? difficultyFilter === 'all'
                ? 'mixed'
                : difficultyFilter
              : null,
            summary: `完成 ${questions.length} 题，答对 ${score} 题（正确率 ${accuracyPct}%）`,
            questionItems: answersRef.current,
          }
        ).catch((err) => {
          console.warn('[PracticePage] Failed to record activity:', err);
        });
      }
    }
  }, [
    finished,
    score,
    questions.length,
    recordPractice,
    user,
    profile,
    resolvedName,
    effectiveAvatarId,
    subject.id,
    subject.name,
    activeTrack,
    grade,
    hasDifficultyTiers,
    difficultyFilter,
    difficultySummaryLabel,
  ]);

  if (questions.length === 0) {
    return (
      <>
        <BackLink href={backHref} />
        <p className="text-2xl font-black mt-10">题目准备中，马上就来 <span aria-hidden="true">🛠️</span></p>
      </>
    );
  }

  if (finished) {
    const perfect = score === questions.length;
    const accuracyPct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const studentName = resolvedName || user?.displayName || '同学';
    const subjectTitle = `${subject.name}${activeTrack ? ` · ${activeTrack.nameZh}` : ''}`;

    return (
      <>
        <BackLink href={backHref} />

        {/* Screenshot-ready Report Card */}
        <div ref={reportRef} className="mt-6 bg-white rounded-3xl border-[3px] border-ink p-6">
          <div className="text-center">
            <p className={`font-extrabold ${theme.text}`}>
              {subjectTitle} · {gradeLabel(grade)}
              {difficultySummaryLabel ? ` · ${difficultySummaryLabel}` : ''} · {studentName}
            </p>
            <h1 className="text-3xl font-black mt-1">
              {perfect ? '全对通关！🏆' : '练习完成！'}
            </h1>
            <p className="text-5xl font-black mt-4 tabular-nums">
              {score}
              <span className="text-2xl text-slate-600"> / {questions.length}</span>
            </p>
            <p className="text-sm font-extrabold text-slate-600 mt-2">
              正确率 {accuracyPct}%
              {durationSec !== null && ` · 用时 ${durationSec} 秒`}
              {poolDraw.totalPoolSize > questions.length && ` · 当前题库 ${poolDraw.totalPoolSize} 题`}
            </p>
          </div>

          <ul className="mt-6 space-y-2.5">
            {reviewList.map((item, i) => {
              const diffMeta = item.difficulty ? PRACTICE_DIFFICULTY_META[item.difficulty] : null;
              return (
                <li
                  key={i}
                  className={`rounded-2xl p-3.5 border-2 ${
                    item.isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 border-ink grid place-items-center ${
                        item.isCorrect ? 'bg-emerald-300' : 'bg-rose-300'
                      }`}
                    >
                      {item.isCorrect ? (
                        <Check className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <X className="w-3 h-3" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      {(diffMeta || item.topic) && (
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          {diffMeta && (
                            <span className={`text-[11px] px-2 py-0.5 rounded-full border border-ink font-black ${diffMeta.badgeClass}`}>
                              {diffMeta.emoji} {diffMeta.shortLabel}
                            </span>
                          )}
                          {item.topic && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-300 bg-white font-bold text-slate-700">
                              {item.topic}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="font-bold text-sm text-ink">{i + 1}. {item.question}</p>
                      <p className="text-xs font-bold text-slate-700 mt-1">
                        你的作答：{item.userAnswer}
                        {!item.isCorrect && (
                          <span className="ml-2 text-emerald-800 font-black">
                            正确答案：{item.correctAnswer}
                          </span>
                        )}
                      </p>
                      {!item.isCorrect && item.explanation && (
                        <p className="text-xs font-semibold text-slate-600 mt-1">{item.explanation}</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-center text-xs font-extrabold text-slate-500 mt-5 tracking-widest">
            K12.VANPOWER.LIVE
          </p>
        </div>

        <RewardBanner outcome={rewardOutcome} />

        <div className="grid grid-cols-2 gap-4 mt-6">
          <button
            type="button"
            onClick={() => setRound((r) => r + 1)}
            className="chunky bg-yellow-300 py-4 text-xl font-black flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" aria-hidden="true" /> 再来一组
          </button>
          <a href={backHref} className="chunky bg-white py-4 text-xl font-black text-center">
            完成
          </a>
        </div>

        <ReportActions
          reportRef={reportRef}
          subjectLabel={`${subjectTitle}（${gradeLabel(grade)}${difficultySummaryLabel ? `·${difficultySummaryLabel}` : ''}）`}
          scoreSummary={`${score}/${questions.length} 题（${accuracyPct}%）`}
          filePrefix={`K12-${subject.id}`}
          sessionKey={`practice-${subject.id}-${grade}-${activeTrack?.id || 'main'}-${difficultyFilter}-${round}`}
        />
      </>
    );
  }

  const q = questions[index];
  const answered = chosen !== null;
  const correct = chosen === q.answer;
  const qDiffMeta = q.difficulty ? PRACTICE_DIFFICULTY_META[q.difficulty] : null;

  const choose = (i: number) => {
    if (answered) return;
    setChosen(i);
    if (i === q.answer) setScore((s) => s + 1);
    const entry: QuestionReviewItem = {
      question: q.question,
      userAnswer: q.options[i] ?? '',
      correctAnswer: q.options[q.answer] ?? '',
      isCorrect: i === q.answer,
      ...(q.topic ? { category: q.topic } : {}),
    };
    answersRef.current.push(entry);
    setReviewList((prev) => [
      ...prev,
      { ...entry, explanation: q.explanation, difficulty: q.difficulty, topic: q.topic },
    ]);
  };

  const next = () => {
    setChosen(null);
    setIndex((i) => i + 1);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <BackLink href={backHref} />
        <span className="font-extrabold text-slate-600 mt-2 text-sm sm:text-base tabular-nums">
          {poolDraw.totalPoolSize > questions.length ? `题库 ${poolDraw.totalPoolSize} 题 · ` : ''}
          {index + 1} / {questions.length}
        </span>
      </div>

      {/* Inline Difficulty Tier Switcher */}
      {hasDifficultyTiers && (
        <div role="group" aria-label="切换练习难度" className="flex flex-wrap gap-1.5 mt-3">
          <button
            type="button"
            aria-pressed={difficultyFilter === 'all'}
            onClick={() => switchDifficulty('all')}
            className={`px-3 py-1 rounded-full border-2 border-ink text-xs font-black transition-colors ${
              difficultyFilter === 'all' ? 'bg-yellow-300' : 'bg-white hover:bg-yellow-50'
            }`}
          >
            🎯 智能混合
          </button>
          {(['foundation', 'standard', 'challenge'] as PracticeDifficulty[]).map((tier) => {
            const meta = PRACTICE_DIFFICULTY_META[tier];
            const active = difficultyFilter === tier;
            return (
              <button
                key={tier}
                type="button"
                aria-pressed={active}
                onClick={() => switchDifficulty(tier)}
                className={`px-3 py-1 rounded-full border-2 border-ink text-xs font-black transition-colors ${
                  active ? meta.badgeClass : 'bg-white hover:bg-yellow-50'
                }`}
              >
                {meta.emoji} {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Progress dots */}
      <div className="flex gap-2 mt-4" aria-hidden="true">
        {questions.map((_, i) => (
          <span
            key={i}
            className={`h-3 flex-1 rounded-full border-2 border-ink ${i < index ? theme.solid : i === index ? 'bg-yellow-300' : 'bg-white'}`}
          />
        ))}
      </div>

      {(qDiffMeta || q.topic) && (
        <div className="flex flex-wrap items-center gap-2 mt-6">
          {qDiffMeta && (
            <span className={`px-3 py-0.5 rounded-full border-2 border-ink text-xs font-black ${qDiffMeta.badgeClass}`}>
              {qDiffMeta.emoji} {qDiffMeta.label}
            </span>
          )}
          {q.topic && (
            <span className="px-3 py-0.5 rounded-full border-2 border-ink bg-white text-xs font-extrabold text-slate-700">
              {q.topic}
            </span>
          )}
        </div>
      )}

      <h1 className={`text-2xl sm:text-3xl font-black leading-snug ${qDiffMeta || q.topic ? 'mt-4' : 'mt-8'}`}>
        {q.question}
      </h1>

      <div className="grid gap-3 mt-6">
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answer;
          const isChosen = i === chosen;
          let style = 'bg-white';
          if (answered && isAnswer) style = 'bg-emerald-200';
          else if (answered && isChosen) style = 'bg-rose-200';

          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={answered}
              className={`chunky ${style} px-5 py-4 text-left text-lg font-bold flex items-center gap-3 disabled:cursor-default`}
            >
              <span className="w-8 h-8 shrink-0 rounded-full border-[3px] border-ink grid place-items-center font-black text-sm bg-white">
                {answered && isAnswer ? (
                  <Check className="w-4 h-4" aria-label="正确答案" />
                ) : answered && isChosen ? (
                  <X className="w-4 h-4" aria-label="你的选择" />
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      <div aria-live="polite">
        {answered && (
          <div className="mt-6">
            <p className="text-2xl font-black">
              {correct ? '答对了！🎉' : `差一点～ 答案是 ${String.fromCharCode(65 + q.answer)}`}
            </p>
            <p className="text-lg font-semibold text-slate-700 mt-1">{q.explanation}</p>
            <button
              type="button"
              onClick={next}
              className="chunky bg-yellow-300 w-full mt-5 py-4 text-xl font-black"
            >
              {index + 1 < questions.length ? '下一题 →' : '看成绩'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
