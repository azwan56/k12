import { Shuffle, PenLine, Star } from 'lucide-react';
import { BackLink } from '../../../k12/SubjectPage';
import { SessionRecord } from '../types';

interface Props {
  name: string;
  history: SessionRecord[];
  onStartRandom: () => void;
  onStartCustom: () => void;
  onClearHistory: () => void;
}

const sessionStars = (s: SessionRecord) => s.results.reduce((acc, r) => acc + r.evaluation.score, 0);

export default function StartScreen({ name, history, onStartRandom, onStartCustom, onClearHistory }: Props) {
  const last = history[0];
  const totalWords = history.reduce((acc, s) => acc + s.results.length, 0);

  return (
    <>
      <BackLink href="#/s/english" />

      <h1 className="text-4xl font-black mt-6">造句练习</h1>
      <p className="font-bold text-rose-800 mt-1">Hi {name}，用新词写一句话吧！</p>

      <div className="grid gap-4 mt-8">
        <button
          type="button"
          onClick={onStartRandom}
          className="chunky bg-yellow-300 py-5 text-2xl font-black flex items-center justify-center gap-3"
        >
          <Shuffle className="w-7 h-7" aria-hidden="true" />
          随机 10 个词
        </button>
        <button
          type="button"
          onClick={onStartCustom}
          className="chunky bg-white py-4 text-xl font-black flex items-center justify-center gap-3"
        >
          <PenLine className="w-6 h-6" aria-hidden="true" />
          自定义词汇
        </button>
      </div>

      {last && (
        <div className="chunky bg-rose-100 mt-8 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="font-extrabold">
            <p>已练 {history.length} 组 · {totalWords} 个词</p>
            <p className="text-rose-800 flex items-center gap-1 mt-1">
              上次
              <Star className="w-4 h-4 fill-yellow-300 text-ink" aria-hidden="true" />
              {sessionStars(last)} / {last.results.length * 5}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearHistory}
            className="text-sm font-extrabold text-slate-600 underline hover:text-ink"
          >
            清除记录
          </button>
        </div>
      )}
    </>
  );
}
