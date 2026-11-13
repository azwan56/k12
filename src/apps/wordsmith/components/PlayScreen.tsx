import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { WordChallenge } from '../types';
import { BackButton, Spinner } from './ui';

interface Props {
  challenge: WordChallenge;
  index: number; // 1-based
  total: number;
  isEvaluating: boolean;
  onSubmit: (sentence: string) => void;
  onQuit: () => void;
}

export function Progress({ index, total }: { index: number; total: number }) {
  return (
    <div className="flex items-center gap-3 mt-6">
      <div
        className="flex-1 h-4 rounded-full border-[3px] border-ink bg-white overflow-hidden"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index}
        aria-label="进度"
      >
        <div className="h-full bg-rose-300" style={{ width: `${(index / total) * 100}%` }} />
      </div>
      <span className="font-black tabular-nums">
        {index} / {total}
      </span>
    </div>
  );
}

export default function PlayScreen({ challenge, index, total, isEvaluating, onSubmit, onQuit }: Props) {
  const [text, setText] = useState('');
  const isError = challenge.partOfSpeech === 'error';

  const submit = () => {
    if (text.trim() && !isEvaluating) onSubmit(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <>
      <BackButton onClick={onQuit} label="退出" />
      <Progress index={index} total={total} />

      <div className="chunky bg-rose-100 mt-6 p-6 text-center">
        {!isError && (
          <span className="inline-block px-3 py-0.5 rounded-full border-[3px] border-ink bg-white text-sm font-extrabold">
            {challenge.partOfSpeech}
          </span>
        )}
        <h1 className="text-4xl sm:text-5xl font-black mt-3 break-words">{challenge.word}</h1>
        <p className={`text-lg font-bold mt-3 ${isError ? 'text-red-800' : 'text-rose-800'}`}>
          {challenge.definition}
        </p>
        {challenge.synonyms?.length > 0 && (
          <p className="text-sm font-bold text-slate-600 mt-2 italic">{challenge.synonyms.join(' · ')}</p>
        )}
      </div>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="ws-sentence" className="sr-only">
          你的句子
        </label>
        <textarea
          id="ws-sentence"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isEvaluating}
          placeholder="Write your sentence here..."
          className="w-full h-32 p-5 border-[3px] border-ink rounded-3xl bg-white text-xl font-bold resize-none placeholder:text-slate-400 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!text.trim() || isEvaluating}
          className="chunky bg-yellow-300 w-full mt-4 py-4 text-xl font-black flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEvaluating ? (
            <>
              <Spinner /> 评分中…
            </>
          ) : (
            <>
              <Send className="w-5 h-5" aria-hidden="true" /> 提交
            </>
          )}
        </button>
      </form>
    </>
  );
}
