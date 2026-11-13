import React, { useState } from 'react';
import {
  BookOpen,
  Calculator,
  Compass,
  FlaskConical,
  Sigma,
  Sparkles,
  PenTool,
  ExternalLink,
  CheckCircle2,
  XCircle,
  GraduationCap
} from 'lucide-react';
import { K12_SUBJECTS, SubjectId, GradeLevel } from '../data/k12Subjects';
import { useAuth } from '../hooks/useAuth';
import EssayStudio from './EssayStudio';

const SUBJECT_ICONS: Record<SubjectId, React.ReactNode> = {
  english: <BookOpen className="w-4 h-4 shrink-0" />,
  'ig-math': <Calculator className="w-4 h-4 shrink-0" />,
  'shanghai-math': <Sigma className="w-4 h-4 shrink-0" />,
  humanity: <Compass className="w-4 h-4 shrink-0" />,
  science: <FlaskConical className="w-4 h-4 shrink-0" />
};

export default function SubjectPortal() {
  const [activeSubjectId, setActiveSubjectId] = useState<SubjectId>('english');
  const [grade, setGrade] = useState<GradeLevel>('G6');
  const [selectedSubTracks, setSelectedSubTracks] = useState<Record<string, string>>({});
  const [showEssayStudio, setShowEssayStudio] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const { generateCustomTokenAndRedirect } = useAuth();

  const handleLaunchExternal = (url: string) => {
    if (url.includes('vanpower.live') || url.includes('vanpower.web.app')) {
      generateCustomTokenAndRedirect(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section className="py-20 px-6 bg-navy-800/30 border-y border-navy-800" id="subjects">
      <div className="max-w-7xl mx-auto">
        {/* Section Header + Grade Toggle */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-accent/10 border border-teal-accent/25 text-teal-accent text-xs font-semibold uppercase tracking-wider mb-3">
              <GraduationCap className="w-3.5 h-3.5" />
              Grade 6 &amp; Grade 7 · 全科入口
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-ivory">
              K12 科目学习中心
            </h2>
            <p className="text-ivory/60 mt-2 max-w-2xl text-sm md:text-base">
              面向 6/7 年级学生的五门核心课程入口：English（Wordsmith 造句 + 命题作文）、IG Math、上海数学、Humanity 与 Science。
            </p>
          </div>

          {/* Grade Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-navy-900 border border-ivory/10 self-start md:self-auto">
            {(['G6', 'G7'] as GradeLevel[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  grade === g
                    ? 'bg-teal-accent text-navy-900'
                    : 'text-ivory/60 hover:text-ivory'
                }`}
              >
                {g === 'G6' ? '六年级 · Grade 6' : '七年级 · Grade 7'}
              </button>
            ))}
          </div>
        </div>

        {/* Single-row scrollable Subject Tablist */}
        <div
          role="tablist"
          aria-label="K12 科目导航"
          className="flex flex-nowrap overflow-x-auto gap-2 border-b border-navy-800 pb-0 mb-8"
        >
          {K12_SUBJECTS.map((subject) => {
            const isSelected = activeSubjectId === subject.id;
            return (
              <button
                key={subject.id}
                type="button"
                role="tab"
                id={`tab-${subject.id}`}
                aria-selected={isSelected}
                onClick={() => setActiveSubjectId(subject.id)}
                className={`flex-none relative px-5 py-3.5 text-sm font-semibold flex items-center gap-2.5 transition-colors whitespace-nowrap border-b-2 ${
                  isSelected
                    ? 'text-teal-accent border-teal-accent bg-navy-800/60 rounded-t-xl'
                    : 'text-ivory/60 border-transparent hover:text-ivory hover:bg-navy-800/30 rounded-t-xl'
                }`}
              >
                {SUBJECT_ICONS[subject.id]}
                <span>{subject.name}</span>
                {subject.name !== subject.nameZh && (
                  <span className="text-xs opacity-60 hidden sm:inline">· {subject.nameZh}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        <div>
          {K12_SUBJECTS.map((subject) => {
            const isSelected = activeSubjectId === subject.id;
            const subTracks = subject.subTracks?.[grade] ?? [];
            const activeSubTrackId =
              subTracks.length > 0
                ? selectedSubTracks[`${subject.id}-${grade}`] || subTracks[0].id
                : null;
            const activeSubTrack = subTracks.find((t) => t.id === activeSubTrackId) || null;
            const displayedTopics = activeSubTrack ? activeSubTrack.topics : subject.topics[grade];
            const gradeQuestions = subject.questions.filter(
              (q) =>
                q.grade === grade &&
                (!activeSubTrack || !q.subTrack || q.subTrack === activeSubTrack.id)
            );

            return (
              <div
                key={subject.id}
                role="tabpanel"
                id={`panel-${subject.id}`}
                aria-labelledby={`tab-${subject.id}`}
                hidden={!isSelected}
                tabIndex={isSelected ? 0 : undefined}
              >
                <div className="glass-card rounded-2xl p-6 md:p-8 border border-teal-accent/15 space-y-8">
                  {/* Top Overview Row */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className={`px-3 py-0.5 rounded-full text-xs font-semibold ${subject.accentBg} ${subject.accentText} border ${subject.accentBorder}`}>
                          {subject.badge}
                        </span>
                        <span className="text-xs text-ivory/50">
                          当前年级：{grade === 'G6' ? '六年级 (Grade 6)' : '七年级 (Grade 7)'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-ivory">
                        {subject.name} <span className="text-ivory/60 font-normal text-lg">/ {subject.nameZh}</span>
                      </h3>
                      <p className="text-ivory/75 text-sm md:text-base leading-relaxed">
                        {subject.overview[grade]}
                      </p>
                    </div>

                    {subject.externalUrl && subject.id !== 'english' && (
                      <button
                        type="button"
                        onClick={() => handleLaunchExternal(subject.externalUrl!.url)}
                        className="px-6 py-3 rounded-xl bg-teal-accent text-navy-900 font-bold text-sm hover:bg-teal-accent/90 transition-colors flex items-center gap-2 self-start lg:self-center shrink-0"
                      >
                        <Sparkles className="w-4 h-4" />
                        {subject.externalUrl.label}
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* English Dual Feature Cards: Wordsmith + 命题作文 */}
                  {subject.id === 'english' && (
                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="rounded-xl bg-navy-900/70 border border-indigo-500/25 p-5 flex flex-col justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                              Feature 01 · 词汇与句型
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                              已上线 · SSO
                            </span>
                          </div>
                          <h4 className="text-xl font-bold text-ivory flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                            Wordsmith 造句练习
                          </h4>
                          <p className="text-xs text-ivory/65 leading-relaxed">
                            高阶词汇语境造句、AI 语法实时纠错、地道表达润色与练习报告推送。
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLaunchExternal('https://wordsmith.vanpower.live')}
                          className="w-full px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          进入 Wordsmith 造句
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="rounded-xl bg-navy-900/70 border border-violet-500/25 p-5 flex flex-col justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">
                              Feature 02 · 写作训练
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-teal-accent/15 text-teal-accent">
                              站内工作台
                            </span>
                          </div>
                          <h4 className="text-xl font-bold text-ivory flex items-center gap-2">
                            <PenTool className="w-5 h-5 text-violet-400" />
                            命题作文 · Essay Studio
                          </h4>
                          <p className="text-xs text-ivory/65 leading-relaxed">
                            针对 6/7 年级记叙文、议论文与说明文提供命题题库、写作框架提示、字数统计与自查评分。
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowEssayStudio((prev) => !prev)}
                          className="w-full px-4 py-2.5 rounded-xl border border-violet-400/50 bg-violet-500/15 hover:bg-violet-500/25 text-violet-200 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          {showEssayStudio ? '收起命题作文工作台' : '展开命题作文工作台'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sub-Tracks Selector (e.g. G7 Humanity: History / Geography; Science: Physics / Biology / Chemistry) */}
                  {subTracks.length > 0 && (
                    <div className="rounded-xl bg-navy-900/60 border border-ivory/10 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-teal-accent uppercase tracking-wider">
                          分科主题 / Sub-Tracks ({grade})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {subTracks.map((track) => {
                            const isTrackActive = track.id === activeSubTrackId;
                            return (
                              <button
                                key={track.id}
                                type="button"
                                onClick={() =>
                                  setSelectedSubTracks((prev) => ({
                                    ...prev,
                                    [`${subject.id}-${grade}`]: track.id
                                  }))
                                }
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                  isTrackActive
                                    ? `${subject.accentBg} ${subject.accentText} ${subject.accentBorder}`
                                    : 'bg-navy-800/60 border-ivory/10 text-ivory/60 hover:text-ivory'
                                }`}
                              >
                                {track.name} · {track.nameZh}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {activeSubTrack && (
                        <p className="text-xs md:text-sm text-ivory/75 leading-relaxed">
                          <span className="font-semibold text-ivory mr-1.5">
                            {activeSubTrack.name} ({activeSubTrack.nameZh}):
                          </span>
                          {activeSubTrack.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Core Topics Grid */}
                  <div>
                    <h4 className="text-xs font-semibold text-teal-accent uppercase tracking-wider mb-3">
                      核心知识模块 / Core Topics ({grade}{activeSubTrack ? ` · ${activeSubTrack.name}` : ''})
                    </h4>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {displayedTopics.map((topic, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl bg-navy-900/60 border border-ivory/10 px-4 py-3 text-sm text-ivory/85 flex items-center gap-2.5"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${subject.accentBg.replace('/10', '')} bg-current ${subject.accentText}`} />
                          <span>{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Practice Section */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-teal-accent uppercase tracking-wider">
                      随堂互动练习 / Interactive Check ({grade})
                    </h4>
                    <div className="grid gap-4">
                      {gradeQuestions.map((q) => {
                        const chosen = selectedAnswers[q.id];
                        const isAnswered = chosen !== undefined;
                        const isCorrect = chosen === q.correctIndex;

                        return (
                          <div
                            key={q.id}
                            className="rounded-xl bg-navy-900/75 border border-ivory/10 p-5 space-y-4"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-navy-800 text-teal-accent">
                                {q.topic}
                              </span>
                              {isAnswered && (
                                <span
                                  className={`text-xs font-semibold flex items-center gap-1 ${
                                    isCorrect ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {isCorrect ? (
                                    <>
                                      <CheckCircle2 className="w-4 h-4" /> 回答正确
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-4 h-4" /> 再看看解析
                                    </>
                                  )}
                                </span>
                              )}
                            </div>

                            <p className="text-sm md:text-base font-medium text-ivory">{q.question}</p>

                            <div className="grid sm:grid-cols-2 gap-2.5">
                              {q.options.map((opt, idx) => {
                                const isThisChosen = chosen === idx;
                                const isThisCorrect = idx === q.correctIndex;
                                let optionStyle =
                                  'border-ivory/10 bg-navy-800/50 text-ivory/80 hover:border-teal-accent/40';

                                if (isAnswered) {
                                  if (isThisCorrect) {
                                    optionStyle = 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200';
                                  } else if (isThisChosen) {
                                    optionStyle = 'border-rose-500/60 bg-rose-500/15 text-rose-200';
                                  }
                                }

                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() =>
                                      setSelectedAnswers((prev) => ({ ...prev, [q.id]: idx }))
                                    }
                                    className={`text-left px-4 py-2.5 rounded-lg border text-xs md:text-sm transition-colors ${optionStyle}`}
                                  >
                                    <span className="font-mono mr-2 opacity-60">
                                      {String.fromCharCode(65 + idx)}.
                                    </span>
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>

                            {isAnswered && (
                              <div className="rounded-lg bg-navy-800/80 border border-teal-accent/20 p-3 text-xs text-ivory/80 leading-relaxed">
                                <span className="font-semibold text-teal-accent mr-1">解析：</span>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Embedded English Essay Studio */}
                  {subject.id === 'english' && showEssayStudio && <EssayStudio grade={grade} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
