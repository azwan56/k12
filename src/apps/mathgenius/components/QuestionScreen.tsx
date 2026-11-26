import { useEffect, useState, type ReactNode } from 'react';
import { Check, X, Lightbulb, ArrowRight, RotateCcw } from 'lucide-react';
import { Question, DifficultyLevel, DIFFICULTY_CONFIGS } from '../types';
import { getQuestionHint } from '../services/hintHelper';
import { BackButton, DIFF_EMOJI } from './ui';

export interface AnswerResultPayload {
  answer: string;
  isCorrect: boolean;
  attempts: number;
  firstAttemptAnswer?: string;
  secondAttemptAnswer?: string;
  usedHint: boolean;
}

interface Props {
  question: Question;
  index: number;
  total: number;
  difficulty: DifficultyLevel;
  language: 'en' | 'zh';
  liveStatusText?: string;
  onProgress?: (result: AnswerResultPayload) => void;
  onAnswer: (result: AnswerResultPayload) => void;
  onQuit: () => void;
}

type CardStatus = 'answering' | 'first_correct' | 'hint_active' | 'second_correct' | 'second_failed';

export default function QuestionScreen({
  question,
  index,
  total,
  difficulty,
  language,
  liveStatusText,
  onProgress,
  onAnswer,
  onQuit,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [firstAttempt, setFirstAttempt] = useState<string | null>(null);
  const [secondAttempt, setSecondAttempt] = useState<string | null>(null);
  const [status, setStatus] = useState<CardStatus>('answering');

  useEffect(() => {
    setSelected(null);
    setFirstAttempt(null);
    setSecondAttempt(null);
    setStatus('answering');
  }, [question.id, index]);

  const hintText = getQuestionHint(question, language);
  const isLast = index === total - 1;
  const resolved = status === 'first_correct' || status === 'second_correct' || status === 'second_failed';
  const canPick = status === 'answering' || status === 'hint_active';

  const submitFirst = () => {
    if (!selected) return;
    if (selected === question.correctAnswer) {
      setStatus('first_correct');
      onProgress?.({ answer: selected, isCorrect: true, attempts: 1, usedHint: false });
    } else {
      // Wrong on first try -> show hint, hide answer, offer a second chance
      setFirstAttempt(selected);
      setSelected(null);
      setStatus('hint_active');
      onProgress?.({
        answer: selected,
        isCorrect: false,
        attempts: 1,
        firstAttemptAnswer: selected,
        usedHint: true,
      });
    }
  };

  const submitSecond = () => {
    if (!selected) return;
    const isCorrect = selected === question.correctAnswer;
    setSecondAttempt(selected);
    setStatus(isCorrect ? 'second_correct' : 'second_failed');
    onProgress?.({
      answer: selected,
      isCorrect,
      attempts: 2,
      firstAttemptAnswer: firstAttempt || undefined,
      secondAttemptAnswer: selected,
      usedHint: true,
    });
  };

  const proceed = () => {
    if (status === 'first_correct') {
      onAnswer({ answer: selected || question.correctAnswer, isCorrect: true, attempts: 1, usedHint: false });
    } else if (status === 'second_correct') {
      onAnswer({
        answer: selected || question.correctAnswer,
        isCorrect: true,
        attempts: 2,
        firstAttemptAnswer: firstAttempt || undefined,
        secondAttemptAnswer: selected || undefined,
        usedHint: true
      });
    } else if (status === 'second_failed') {
      onAnswer({
        answer: secondAttempt || '',
        isCorrect: false,
        attempts: 2,
        firstAttemptAnswer: firstAttempt || undefined,
        secondAttemptAnswer: secondAttempt || undefined,
        usedHint: true
      });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <BackButton onClick={onQuit} label="退出" />
        <div className="flex items-center gap-2 mt-2">
          {liveStatusText && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 font-extrabold text-emerald-800">
              {liveStatusText}
            </span>
          )}
          <span className="font-extrabold text-slate-600">
            {index + 1} / {total}
          </span>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mt-4" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-3 flex-1 rounded-full border-2 border-ink ${
              i < index ? 'bg-sky-300' : i === index ? 'bg-yellow-300' : 'bg-white'
            }`}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mt-6 text-sm font-extrabold">
        {question.category && (
          <span className="bg-sky-100 text-sky-800 px-3 py-1 rounded-full">{question.category}</span>
        )}
        <span className="bg-white border-2 border-ink px-3 py-0.5 rounded-full">
          <span aria-hidden="true">{DIFF_EMOJI[difficulty]}</span> {DIFFICULTY_CONFIGS[difficulty].shortLabelZh}
        </span>
        {status === 'hint_active' && (
          <span className="bg-amber-200 border-2 border-ink px-3 py-0.5 rounded-full inline-flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> 第 2 次机会
          </span>
        )}
      </div>

      <h1 className="text-2xl sm:text-3xl font-black leading-snug mt-4 whitespace-pre-line break-words">
        {question.question}
      </h1>

      <div className="grid gap-3 mt-6">
        {question.options.map((option, idx) => {
          const isSelected = selected === option;
          const isCorrect = option === question.correctAnswer;
          const isEliminated = status === 'hint_active' && option === firstAttempt;
          const isWrongPick = resolved && !isCorrect && (option === firstAttempt || option === secondAttempt);

          let style = 'bg-white';
          let badge: ReactNode = String.fromCharCode(65 + idx);
          let tag: string | null = null;

          if (isEliminated) {
            style = 'bg-slate-100 text-slate-600';
            badge = <X className="w-4 h-4" aria-hidden="true" />;
            tag = '已排除';
          } else if (canPick && isSelected) {
            style = status === 'hint_active' ? 'bg-amber-200' : 'bg-sky-300';
          } else if (resolved && isCorrect) {
            style = 'bg-emerald-200';
            badge = <Check className="w-4 h-4" aria-hidden="true" />;
            tag = '正确答案';
          } else if (isWrongPick) {
            style = 'bg-rose-200';
            badge = <X className="w-4 h-4" aria-hidden="true" />;
            tag = '你的选择';
          } else if (resolved) {
            style = 'bg-white text-slate-600';
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={!canPick || isEliminated}
              aria-pressed={canPick ? isSelected : undefined}
              onClick={() => canPick && setSelected(option)}
              className={`chunky ${style} px-5 py-4 text-left text-lg font-bold flex items-center gap-3 disabled:cursor-default`}
            >
              <span className="w-8 h-8 shrink-0 rounded-full border-[3px] border-ink grid place-items-center font-black text-sm bg-white">
                {badge}
              </span>
              <span className={`flex-1 min-w-0 break-words ${isEliminated ? 'line-through' : ''}`}>{option}</span>
              {tag && <span className="shrink-0 text-sm font-black">{tag}</span>}
            </button>
          );
        })}
      </div>

      <div aria-live="polite">
        {status === 'hint_active' && (
          <div className="mt-6 bg-amber-100 rounded-3xl border-[3px] border-ink p-5">
            <p className="text-xl font-black flex items-center gap-2">
              <X className="w-6 h-6" aria-hidden="true" /> 再想想
            </p>
            <p className="mt-2 font-bold flex items-start gap-2">
              <Lightbulb className="w-5 h-5 shrink-0 mt-0.5 text-amber-800" aria-hidden="true" />
              <span>{hintText}</span>
            </p>
          </div>
        )}
        {status === 'first_correct' && (
          <p className="mt-6 text-2xl font-black flex items-center gap-2">
            <Check className="w-7 h-7 text-emerald-700" aria-hidden="true" /> 答对了！
          </p>
        )}
        {status === 'second_correct' && (
          <p className="mt-6 text-2xl font-black flex items-center gap-2">
            <Check className="w-7 h-7 text-emerald-700" aria-hidden="true" /> 改对了！
          </p>
        )}
        {status === 'second_failed' && (
          <div className="mt-6 bg-sky-100 rounded-3xl border-[3px] border-ink p-5">
            <p className="text-xl font-black flex items-center gap-2">
              <X className="w-6 h-6 text-rose-700" aria-hidden="true" /> 答案是 {question.correctAnswer}
            </p>
            <p className="mt-2 font-semibold text-ink whitespace-pre-line break-words">{question.explanation}</p>
          </div>
        )}
      </div>

      {status === 'answering' && (
        <button
          type="button"
          onClick={submitFirst}
          disabled={!selected}
          className="chunky bg-yellow-300 mt-8 w-full py-4 text-xl font-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          提交
        </button>
      )}
      {status === 'hint_active' && (
        <button
          type="button"
          onClick={submitSecond}
          disabled={!selected}
          className="chunky bg-yellow-300 mt-8 w-full py-4 text-xl font-black flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-5 h-5" aria-hidden="true" /> 再试一次
        </button>
      )}
      {resolved && (
        <button
          type="button"
          onClick={proceed}
          className="chunky bg-yellow-300 mt-8 w-full py-4 text-xl font-black flex items-center justify-center gap-2"
        >
          {isLast ? '看结果' : '下一题'} <ArrowRight className="w-5 h-5" aria-hidden="true" />
        </button>
      )}
    </>
  );
}
