import { useState } from 'react';
import { BackButton, Spinner } from './ui';

interface Props {
  onSubmit: (words: string[]) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function CustomWordInput({ onSubmit, onCancel, isLoading }: Props) {
  const [inputText, setInputText] = useState('');

  // Same parsing as the original: split by commas or new lines, trim, de-duplicate.
  const words = Array.from(
    new Set(inputText.split(/[\n,]+/).map((w) => w.trim()).filter((w) => w.length > 0))
  );

  const handleSubmit = () => {
    if (words.length > 0) onSubmit(words);
  };

  return (
    <>
      <BackButton onClick={onCancel} />

      <h1 className="text-3xl font-black mt-6">输入你的单词</h1>
      <p className="font-bold text-slate-600 mt-1">用逗号或换行分开</p>

      <label htmlFor="ws-words" className="sr-only">单词列表</label>
      <textarea
        id="ws-words"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        disabled={isLoading}
        placeholder="brave, curious, explore"
        className="w-full h-48 mt-6 p-5 border-[3px] border-ink rounded-3xl bg-white text-xl font-bold resize-none placeholder:text-slate-400 disabled:opacity-60"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading || words.length === 0}
        className="chunky bg-yellow-300 w-full mt-6 py-4 text-xl font-black flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Spinner /> 准备中…
          </>
        ) : (
          <>开始练习{words.length > 0 ? `（${words.length} 个）` : ''}</>
        )}
      </button>
    </>
  );
}
