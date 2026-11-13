import { Play, Target, Bot } from 'lucide-react';
import { BackLink } from '../../../k12/SubjectPage';
import type { GradeLevel } from '../../../data/k12Subjects';
import { GRADE_6_CATEGORIES, DIFFICULTY_CONFIGS, DifficultyLevel } from '../types';
import { DIFF_EMOJI } from './ui';

const CATEGORY_EMOJI: Record<string, string> = {
  all: '✨',
  ratios_percentages: '%',
  fractions_decimals: '➗',
  algebra_equations: '𝑥',
  circles_geometry: '⭕',
  integers_coordinates: '🧭'
};

interface Props {
  grade: GradeLevel;
  backHref: string;
  language: 'en' | 'zh';
  onLanguage: (l: 'en' | 'zh') => void;
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  difficulty: DifficultyLevel;
  onSelectDifficulty: (d: DifficultyLevel) => void;
  adaptiveMode: boolean;
  onToggleAdaptiveMode: () => void;
  weakCategories: string[];
  totalQuizzesTaken: number;
  error: string | null;
  onStart: () => void;
}

const pill = (active: boolean) =>
  `px-4 py-2 rounded-full border-[3px] border-ink font-extrabold transition-colors ${
    active ? 'bg-sky-300 shadow-[3px_3px_0_var(--color-ink)]' : 'bg-white hover:bg-yellow-50'
  }`;

export default function WelcomeScreen({
  grade,
  backHref,
  language,
  onLanguage,
  selectedCategory,
  onSelectCategory,
  difficulty,
  onSelectDifficulty,
  adaptiveMode,
  onToggleAdaptiveMode,
  weakCategories,
  totalQuizzesTaken,
  error,
  onStart
}: Props) {
  const weakLabels = weakCategories
    .map((id) => GRADE_6_CATEGORIES.find((c) => c.id === id)?.labelZh ?? id)
    .filter(Boolean);

  return (
    <>
      <BackLink href={backHref} />

      <div className="flex items-start justify-between gap-3 mt-6">
        <div className="min-w-0">
          <h1 className="text-4xl font-black">MathGenius</h1>
          <p className="font-bold text-sky-800">
            {grade === 'G7' ? '六年级内容复习' : '六年级'} · AI 出题 10 道
            {totalQuizzesTaken > 0 && ` · 已练 ${totalQuizzesTaken} 次`}
          </p>
        </div>
        <div role="group" aria-label="出题语言" className="flex shrink-0 rounded-full border-[3px] border-ink overflow-hidden mt-1">
          {(['en', 'zh'] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={language === l}
              onClick={() => onLanguage(l)}
              className={`px-3 py-1 font-extrabold text-sm ${language === l ? 'bg-sky-300' : 'bg-white hover:bg-yellow-50'}`}
            >
              {l === 'en' ? 'EN' : '中'}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <h2 className="text-xl font-black mt-8">选知识点</h2>
      <div role="group" aria-label="选知识点" className="grid sm:grid-cols-2 gap-3 mt-3">
        {GRADE_6_CATEGORIES.map((cat) => {
          const active = cat.id === selectedCategory;
          const weak = weakCategories.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-3xl border-[3px] border-ink text-left font-extrabold transition-colors ${
                active ? 'bg-sky-300 shadow-[4px_4px_0_var(--color-ink)]' : 'bg-white hover:bg-yellow-50'
              }`}
            >
              <span
                className="w-10 h-10 shrink-0 rounded-2xl border-[3px] border-ink bg-white grid place-items-center text-lg font-black"
                aria-hidden="true"
              >
                {CATEGORY_EMOJI[cat.id] ?? '✨'}
              </span>
              <span className="flex-1 min-w-0 leading-tight">{cat.labelZh}</span>
              {weak && (
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full bg-amber-200 text-ink border-2 border-ink">
                  <Target className="w-3 h-3" aria-hidden="true" />
                  弱项
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Difficulty */}
      <h2 className="text-xl font-black mt-8">难度</h2>
      <div className="flex flex-wrap items-center gap-2.5 mt-3">
        <div role="group" aria-label="难度" className="flex flex-wrap gap-2.5">
          {(Object.keys(DIFFICULTY_CONFIGS) as DifficultyLevel[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              aria-pressed={difficulty === lvl}
              onClick={() => onSelectDifficulty(lvl)}
              className={pill(difficulty === lvl)}
            >
              <span aria-hidden="true">{DIFF_EMOJI[lvl]}</span> {DIFFICULTY_CONFIGS[lvl].shortLabelZh}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={adaptiveMode}
          onClick={onToggleAdaptiveMode}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-ink text-sm font-extrabold ${
            adaptiveMode ? 'bg-emerald-200' : 'bg-white'
          }`}
        >
          <Bot className="w-4 h-4" aria-hidden="true" />
          {adaptiveMode ? '自动调级：开' : '自动调级：关'}
        </button>
      </div>

      {weakLabels.length > 0 && (
        <p className="mt-5 bg-sky-100 rounded-2xl px-4 py-3 font-bold text-sky-800 flex items-start gap-2">
          <Target className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>重点加练：{weakLabels.join('、')}</span>
        </p>
      )}

      {error && (
        <p role="alert" className="mt-5 bg-rose-100 border-[3px] border-ink rounded-2xl px-4 py-3 font-bold text-rose-800">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onStart}
        className="chunky bg-yellow-300 mt-8 w-full py-4 text-xl font-black flex items-center justify-center gap-3"
      >
        <Play className="w-6 h-6 fill-current" aria-hidden="true" />
        开始
      </button>
    </>
  );
}
