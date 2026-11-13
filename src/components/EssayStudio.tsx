import React, { useState, useEffect, useMemo } from 'react';
import { PenTool, CheckCircle2, RotateCcw, Sparkles, Clock, BookOpen } from 'lucide-react';
import { ESSAY_PROMPTS, GradeLevel } from '../data/k12Subjects';

interface EssayStudioProps {
  grade: GradeLevel;
}

const RUBRIC_ITEMS = [
  { id: 'hook', label: 'Clear opening hook & thesis / 开头点题与中心论点明确' },
  { id: 'details', label: 'Specific examples & supporting details / 论据或细节描写充实' },
  { id: 'transitions', label: 'Cohesive transitions (However, Therefore...) / 逻辑衔接自然' },
  { id: 'grammar', label: 'Checked tense, punctuation & Wordsmith vocab / 时态、标点与高阶词汇检查' }
];

export default function EssayStudio({ grade }: EssayStudioProps) {
  const gradePrompts = useMemo(
    () => ESSAY_PROMPTS.filter((p) => p.grade === grade),
    [grade]
  );

  const [selectedPromptId, setSelectedPromptId] = useState(gradePrompts[0]?.id ?? '');
  const [draft, setDraft] = useState('');
  const [checkedRubric, setCheckedRubric] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!gradePrompts.some((p) => p.id === selectedPromptId)) {
      setSelectedPromptId(gradePrompts[0]?.id ?? '');
    }
  }, [grade, gradePrompts, selectedPromptId]);

  const activePrompt = gradePrompts.find((p) => p.id === selectedPromptId) || gradePrompts[0];

  useEffect(() => {
    if (!activePrompt) return;
    const saved = localStorage.getItem(`k12_essay_${activePrompt.id}`);
    setDraft(saved ?? '');
    setSubmitted(false);
  }, [activePrompt?.id]);

  const handleDraftChange = (val: string) => {
    setDraft(val);
    if (activePrompt) {
      localStorage.setItem(`k12_essay_${activePrompt.id}`, val);
    }
  };

  const wordCount = useMemo(() => {
    const trimmed = draft.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [draft]);

  const rubricScore = Object.values(checkedRubric).filter(Boolean).length;
  const [minWords, maxWords] = activePrompt?.targetWords ?? [150, 250];
  const inWordRange = wordCount >= minWords && wordCount <= maxWords;

  const toggleRubric = (id: string) => {
    setCheckedRubric((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!activePrompt) return null;

  return (
    <div className="mt-6 rounded-2xl border border-indigo-500/25 bg-navy-900/80 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-ivory">命题作文工作台 · Prompted Essay Studio</h4>
            <p className="text-xs text-ivory/60">
              {grade === 'G6' ? '六年级目标字数：150–250 词' : '七年级目标字数：200–320 词'} · 自动保存草稿
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {gradePrompts.map((p) => {
            const active = p.id === activePrompt.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPromptId(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                    : 'bg-navy-800/60 border-ivory/10 text-ivory/60 hover:text-ivory'
                }`}
              >
                {p.genre}
              </button>
            );
          })}
        </div>
      </div>

      {/* Prompt Card */}
      <div className="rounded-xl bg-navy-800/70 border border-ivory/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
            {activePrompt.genre}
          </span>
          <span className="text-xs text-ivory/50 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> 建议用时 20–25 min
          </span>
        </div>
        <h5 className="text-base font-bold text-ivory">{activePrompt.title}</h5>
        <p className="text-sm text-ivory/80 leading-relaxed">{activePrompt.prompt}</p>
        <div className="pt-2 border-t border-ivory/5 grid sm:grid-cols-3 gap-2">
          {activePrompt.tips.map((tip, idx) => (
            <div key={idx} className="text-xs text-ivory/60 bg-navy-900/60 rounded-lg p-2.5 flex items-start gap-2">
              <BookOpen className="w-3.5 h-3.5 text-teal-accent shrink-0 mt-0.5" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="essay-editor" className="text-ivory/70 font-medium">
            Your Essay Draft / 作文正文
          </label>
          <span
            className={`font-mono px-2 py-0.5 rounded ${
              inWordRange
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-navy-800 text-ivory/60'
            }`}
          >
            {wordCount} / {minWords}–{maxWords} words
          </span>
        </div>
        <textarea
          id="essay-editor"
          rows={8}
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          placeholder="Start writing your essay here... Try incorporating vocabulary from Wordsmith!"
          className="w-full rounded-xl bg-navy-900 border border-ivory/15 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none p-4 text-sm text-ivory leading-relaxed resize-y"
        />
      </div>

      {/* Self-Review Rubric & Actions */}
      <div className="grid md:grid-cols-2 gap-4 items-start">
        <div className="rounded-xl bg-navy-800/40 border border-ivory/10 p-4 space-y-2.5">
          <div className="text-xs font-semibold text-teal-accent uppercase tracking-wider">
            自查清单 / Self-Review Rubric ({rubricScore}/4)
          </div>
          {RUBRIC_ITEMS.map((item) => (
            <label key={item.id} className="flex items-start gap-2.5 text-xs text-ivory/80 cursor-pointer">
              <input
                type="checkbox"
                checked={!!checkedRubric[item.id]}
                onChange={() => toggleRubric(item.id)}
                className="mt-0.5 accent-teal-accent"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>

        <div className="flex flex-col justify-between h-full gap-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              disabled={wordCount === 0}
              className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              提交自评报告
            </button>
            <button
              type="button"
              onClick={() => {
                handleDraftChange('');
                setCheckedRubric({});
                setSubmitted(false);
              }}
              className="px-4 py-2.5 rounded-xl border border-ivory/15 hover:border-ivory/30 text-ivory/70 text-sm flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              清空
            </button>
          </div>

          {submitted && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-200 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                作文自评完成 · {wordCount} 词 · 自查 {rubricScore}/4 项
              </div>
              <p className="text-emerald-200/80">
                {wordCount < minWords
                  ? `当前字数偏少（目标 ${minWords}–${maxWords} 词），建议补充 1–2 个具体例子。`
                  : wordCount > maxWords
                    ? `当前字数略超上限（目标 ${minWords}–${maxWords} 词），可尝试精简重复表达。`
                    : '字数非常标准！建议结合 Wordsmith 高阶词汇再润色一次开头与结尾。'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
