import { ArrowRight, Check, RotateCcw } from 'lucide-react';
import { EvaluationResult, WordChallenge } from '../types';
import { BackButton, Stars, scoreLabel } from './ui';
import { Progress } from './PlayScreen';

interface Props {
  challenge: WordChallenge;
  result: EvaluationResult;
  userSentence: string;
  index: number; // 1-based
  total: number;
  isLastWord: boolean;
  onNext: () => void;
  onQuit: () => void;
}

export default function FeedbackScreen({ challenge, result, userSentence, index, total, isLastWord, onNext, onQuit }: Props) {
  const good = result.score >= 3;
  const Icon = good ? Check : RotateCcw;

  return (
    <>
      <BackButton onClick={onQuit} label="退出" />
      <Progress index={index} total={total} />

      <div className="chunky bg-white mt-6 p-6 text-center" role="status">
        <p className="font-extrabold text-rose-800">{challenge.word}</p>
        <div className="mt-2">
          <Stars score={result.score} size="lg" />
        </div>
        <p className="text-3xl font-black mt-2 flex items-center justify-center gap-2">
          <Icon className="w-8 h-8" strokeWidth={3} aria-hidden="true" />
          {scoreLabel(result.score)}
          <span className="text-xl text-slate-600 tabular-nums">{result.score}/5</span>
        </p>
        <p className="text-lg font-bold mt-4 italic text-slate-700">"{userSentence}"</p>
        <p className="text-lg font-bold mt-4">{result.feedback}</p>
      </div>

      {result.correction && (
        <div className="mt-5 p-5 rounded-3xl border-[3px] border-ink bg-amber-100">
          <p className="text-sm font-black text-amber-800">改一改</p>
          <p className="text-lg font-bold mt-1">"{result.correction}"</p>
        </div>
      )}

      {result.betterExamples?.length > 0 && (
        <div className="mt-5 p-5 rounded-3xl border-[3px] border-ink bg-rose-100">
          <p className="text-sm font-black text-rose-800">参考例句</p>
          <ol className="mt-2 space-y-2">
            {result.betterExamples.map((ex, i) => (
              <li key={i} className="flex gap-3 font-bold">
                <span className="shrink-0 w-6 h-6 rounded-full bg-white border-2 border-ink grid place-items-center text-xs font-black">
                  {i + 1}
                </span>
                <span>{ex}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        autoFocus
        className="chunky bg-yellow-300 w-full mt-6 py-4 text-xl font-black flex items-center justify-center gap-2"
      >
        {isLastWord ? '查看成绩' : '下一个'}
        <ArrowRight className="w-6 h-6" aria-hidden="true" />
      </button>
    </>
  );
}
