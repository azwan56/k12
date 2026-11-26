import { useMemo, useRef } from 'react';
import {
  Check,
  X,
  Lightbulb,
  Loader2,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Award,
  Timer
} from 'lucide-react';
import { QuizResult, Question, UserAnswer, DIFFICULTY_CONFIGS } from '../types';
import ActivitySyncStatus, { type ActivitySyncState } from '../../../k12/ActivitySyncStatus';
import ReportActions from '../../../k12/ReportActions';
import type { ActivityRewardOutcome } from '../../../k12/rewards';
import RewardBanner from '../../../k12/RewardBanner';
import { BackButton, DIFF_EMOJI } from './ui';

interface Props {
  results: QuizResult;
  questions: Question[];
  isFeedbackLoading: boolean;
  language: 'en' | 'zh';
  rewardOutcome?: ActivityRewardOutcome | null;
  syncStatus?: ActivitySyncState;
  onRetrySync?: () => void;
  onRetry: () => void;
  onDone: () => void;
}

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
};

function ReviewItem({ question, idx, ans }: { question: Question; idx: number; ans?: UserAnswer }) {
  const correct = !!ans?.isCorrect;
  const corrected = correct && ans?.attempts === 2;
  return (
    <li>
      <details className="group bg-white rounded-3xl border-[3px] border-ink">
        <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <span
            className={`w-8 h-8 shrink-0 rounded-full border-[3px] border-ink grid place-items-center ${
              correct ? (corrected ? 'bg-amber-200' : 'bg-emerald-200') : 'bg-rose-200'
            }`}
          >
            {correct ? <Check className="w-4 h-4" aria-hidden="true" /> : <X className="w-4 h-4" aria-hidden="true" />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-black text-slate-600">
              {idx + 1}. {correct ? (corrected ? '提示后改对' : '一次答对') : '未答对'}
            </span>
            <span className="block font-bold truncate">{question.question}</span>
          </span>
        </summary>
        <div className="px-4 pb-4 space-y-2 font-semibold">
          <p className="whitespace-pre-line break-words">{question.question}</p>
          <p>
            <span className="font-black">你的答案：</span>
            {ans?.firstAttemptAnswer && ans.firstAttemptAnswer !== ans.answer ? (
              <>
                <span className="line-through text-slate-600">{ans.firstAttemptAnswer}</span> → {ans.answer}
              </>
            ) : (
              ans?.answer || '未作答'
            )}
          </p>
          {!correct && (
            <p>
              <span className="font-black">正确答案：</span>
              {question.correctAnswer}
            </p>
          )}
          <p className="bg-sky-100 text-ink rounded-2xl px-3 py-2 whitespace-pre-line break-words">{question.explanation}</p>
        </div>
      </details>
    </li>
  );
}

export default function ResultScreen({
  results,
  questions,
  isFeedbackLoading,
  language,
  rewardOutcome,
  syncStatus = 'idle',
  onRetrySync,
  onRetry,
  onDone,
}: Props) {
  const reportRef = useRef<HTMLDivElement>(null);

  const percentage = results.totalQuestions > 0 ? (results.score / results.totalQuestions) * 100 : 0;
  const correctedCount = useMemo(
    () => results.answers.filter((a) => a.isCorrect && a.attempts === 2).length,
    [results.answers]
  );
  const wrongTopics = useMemo(
    () =>
      Array.from(
        new Set(
          results.answers
            .filter((a) => !a.isCorrect)
            .map((a) => questions.find((q) => q.id === a.questionId)?.category || '核心考点')
        )
      ),
    [results.answers, questions]
  );
  const rec = results.levelRecommendation;

  return (
    <>
      <BackButton onClick={onDone} />

      <div ref={reportRef} className="mt-6 space-y-5 p-2 rounded-3xl">
        {/* Score */}
        <div className="chunky bg-sky-100 p-6 sm:p-8 text-center">
          <div className="text-6xl" aria-hidden="true">
            {percentage === 100 ? '🏆' : percentage >= 80 ? '🎉' : percentage >= 50 ? '👍' : '💪'}
          </div>
          <p className="text-5xl font-black mt-3">
            {results.score} / {results.totalQuestions}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4 text-sm font-extrabold">
            {results.difficulty && (
              <span className="bg-white border-2 border-ink px-3 py-0.5 rounded-full">
                <span aria-hidden="true">{DIFF_EMOJI[results.difficulty]}</span>{' '}
                {DIFFICULTY_CONFIGS[results.difficulty].shortLabelZh}
              </span>
            )}
            <span className="bg-white border-2 border-ink px-3 py-0.5 rounded-full inline-flex items-center gap-1">
              <Timer className="w-3.5 h-3.5" aria-hidden="true" /> {formatTime(results.timeTaken)}
            </span>
            {correctedCount > 0 && (
              <span className="bg-amber-200 border-2 border-ink px-3 py-0.5 rounded-full inline-flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" /> {correctedCount} 题提示后改对
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-slate-600 mt-3">{results.date}</p>
        </div>

        {/* AI feedback */}
        <div className="bg-white rounded-3xl border-[3px] border-ink p-5" aria-live="polite">
          <p className="text-sm font-black text-sky-800">老师评语</p>
          {results.feedback ? (
            <p className="mt-1 text-lg font-bold leading-relaxed">{results.feedback}</p>
          ) : (
            <p className="mt-1 font-bold text-slate-600 flex items-center gap-2">
              <Loader2 className="w-5 h-5 motion-safe:animate-spin" aria-hidden="true" />
              老师正在写评语…
            </p>
          )}
        </div>

        {/* Level change */}
        {rec && (
          <div className="bg-white rounded-3xl border-[3px] border-ink p-5 flex items-start gap-3">
            <span
              className={`w-10 h-10 shrink-0 rounded-2xl border-[3px] border-ink grid place-items-center ${
                rec.action === 'promoted' ? 'bg-emerald-200' : rec.action === 'demoted' ? 'bg-amber-200' : 'bg-sky-200'
              }`}
            >
              {rec.action === 'promoted' ? (
                <TrendingUp className="w-5 h-5" aria-hidden="true" />
              ) : rec.action === 'demoted' ? (
                <TrendingDown className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Award className="w-5 h-5" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <p className="font-black">
                {DIFFICULTY_CONFIGS[rec.previousLevel].shortLabelZh} → {DIFFICULTY_CONFIGS[rec.newLevel].shortLabelZh}
              </p>
              <p className="font-semibold text-slate-700 mt-0.5">{language === 'zh' ? rec.reasonZh : rec.reasonEn}</p>
            </div>
          </div>
        )}

        {/* Weak topics */}
        {wrongTopics.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-black">下次加练：</span>
            {wrongTopics.map((t) => (
              <span key={t} className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Review */}
        <div>
          <h2 className="text-xl font-black">逐题回顾</h2>
          <ul className="mt-3 space-y-2.5">
            {questions.map((q, idx) => (
              <ReviewItem key={q.id} question={q} idx={idx} ans={results.answers.find((a) => a.questionId === q.id)} />
            ))}
          </ul>
        </div>

        <p className="text-center text-xs font-extrabold text-slate-500 pt-2 tracking-widest">
          K12.VANPOWER.LIVE
        </p>
      </div>

      <RewardBanner outcome={rewardOutcome ?? null} />

      <ActivitySyncStatus status={syncStatus} onRetry={onRetrySync} />

      <div className="grid grid-cols-2 gap-4 mt-6">
        <button
          type="button"
          onClick={onRetry}
          className="chunky bg-yellow-300 py-4 text-xl font-black flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" aria-hidden="true" /> 再来一次
        </button>
        <button type="button" onClick={onDone} className="chunky bg-white py-4 text-xl font-black">
          完成
        </button>
      </div>

      <ReportActions
        reportRef={reportRef}
        backgroundColor="#FFF8EC"
        ready={!isFeedbackLoading && Boolean(results.feedback)}
        subjectLabel="MathGenius · 数学自适应闯关"
        scoreSummary={`${results.score}/${results.totalQuestions} 题（${Math.round(percentage)}%）`}
        filePrefix="MathGenius-Report"
        sessionKey={results.date}
      />
    </>
  );
}
