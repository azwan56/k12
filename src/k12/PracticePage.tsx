import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, X, RotateCcw } from 'lucide-react';
import { Subject, GradeLevel, gradeLabel } from '../data/k12Subjects';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useRewards } from '../hooks/useRewards';
import type { ActivityRewardOutcome } from './rewards';
import RewardBanner from './RewardBanner';
import type { QuestionReviewItem } from './studentProgress';
import { recordStudentActivity } from './studentProgressService';
import { THEME } from './ui';
import { BackLink } from './SubjectPage';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  subject: Subject;
  grade: GradeLevel;
  track: string | null;
}

export default function PracticePage({ subject, grade, track }: Props) {
  const theme = THEME[subject.id];
  const tracks = subject.tracks?.[grade] ?? [];
  const activeTrack = tracks.find((t) => t.id === track) ?? tracks[0];
  const backHref = `#/s/${subject.id}${activeTrack ? `?t=${activeTrack.id}` : ''}`;

  const [round, setRound] = useState(0);

  // Shuffle question order and option order every round so answers can't be memorised by position.
  const questions = useMemo(
    () =>
      shuffle(
        subject.questions.filter(
          (q) => q.grade === grade && (!activeTrack || q.track === activeTrack.id)
        )
      ).map((q) => {
        const order = shuffle(q.options.map((_, i) => i));
        return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
      }),
    [subject, grade, activeTrack?.id, round]
  );

  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [rewardOutcome, setRewardOutcome] = useState<ActivityRewardOutcome | null>(null);
  const awardedRef = useRef(false);
  const answersRef = useRef<QuestionReviewItem[]>([]);
  const startedAtRef = useRef(Date.now());
  const { user } = useAuth();
  const { profile, resolvedName, effectiveAvatarId } = useProfile();
  const { recordPractice } = useRewards();

  const restart = () => {
    setIndex(0);
    setChosen(null);
    setScore(0);
    setRewardOutcome(null);
    awardedRef.current = false;
    answersRef.current = [];
    startedAtRef.current = Date.now();
  };

  useEffect(restart, [questions]);

  const finished = questions.length > 0 && index >= questions.length;

  useEffect(() => {
    if (finished && !awardedRef.current) {
      awardedRef.current = true;
      const outcome = recordPractice(score, questions.length);
      setRewardOutcome(outcome);
      if (user) {
        const durationSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const accuracyPct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
        void recordStudentActivity(
          user,
          { profile, resolvedName, effectiveAvatarId, rewards: outcome.nextState },
          {
            type: 'practice',
            subjectId: subject.id,
            title: `${subject.name} · ${gradeLabel(grade)}专题练习`,
            grade,
            score,
            maxScore: questions.length,
            accuracyPct,
            durationSec,
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
    grade,
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
    return (
      <>
        <BackLink href={backHref} />
        <div className={`chunky ${theme.soft} mt-8 p-8 text-center`}>
          <div className="text-6xl" aria-hidden="true">{perfect ? '🏆' : score > 0 ? '🎉' : '💪'}</div>
          <p className="text-5xl font-black mt-4">
            {score} / {questions.length}
          </p>
          <p className="text-xl font-bold mt-2">{perfect ? '全对，太棒了！' : '继续加油！'}</p>
        </div>
        <RewardBanner outcome={rewardOutcome} />
        <div className="grid grid-cols-2 gap-4 mt-6">
          <button type="button" onClick={() => setRound((r) => r + 1)} className="chunky bg-white py-4 text-xl font-black flex items-center justify-center gap-2">
            <RotateCcw className="w-5 h-5" aria-hidden="true" /> 再来一次
          </button>
          <a href={backHref} className="chunky bg-yellow-300 py-4 text-xl font-black text-center">
            完成
          </a>
        </div>
      </>
    );
  }

  const q = questions[index];
  const answered = chosen !== null;
  const correct = chosen === q.answer;

  const choose = (i: number) => {
    if (answered) return;
    setChosen(i);
    if (i === q.answer) setScore((s) => s + 1);
    answersRef.current.push({
      question: q.question,
      userAnswer: q.options[i] ?? '',
      correctAnswer: q.options[q.answer] ?? '',
      isCorrect: i === q.answer,
    });
  };

  const next = () => {
    setChosen(null);
    setIndex((i) => i + 1);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <BackLink href={backHref} />
        <span className="font-extrabold text-slate-600 mt-2">
          {index + 1} / {questions.length}
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mt-4" aria-hidden="true">
        {questions.map((_, i) => (
          <span
            key={i}
            className={`h-3 flex-1 rounded-full border-2 border-ink ${i < index ? theme.solid : i === index ? 'bg-yellow-300' : 'bg-white'}`}
          />
        ))}
      </div>

      <h1 className="text-2xl sm:text-3xl font-black leading-snug mt-8">{q.question}</h1>

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
