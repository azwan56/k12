import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Check,
  ClipboardCheck,
  Filter,
  RotateCcw,
  Target,
  X,
} from 'lucide-react';
import {
  IG_MATH_G6_EXAM_SIZE,
  IG_MATH_G6_EXAM_TOPICS,
  IG_MATH_G6_PASS_THRESHOLD_PCT,
  IG_MATH_G6_REMEDIATION_SIZE,
  type IgMathG6ExamQuestion,
  type RemediationAllocationItem,
  analyzeExamPerformance,
  generateIgMathG6ExamPaper,
  generateTargetedRemediationPaper,
} from '../data/igMathG6ExamGenerator';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useRewards } from '../hooks/useRewards';
import ActivitySyncStatus, { type ActivitySyncState } from './ActivitySyncStatus';
import { recordLocalDailyMistake } from './dailyMistakes';
import ExamDiagram from './ExamDiagram';
import { buildDeterministicActivityId } from './pendingActivityQueue';
import ReportActions from './ReportActions';
import type { ActivityRewardOutcome, RewardsState } from './rewards';
import RewardBanner from './RewardBanner';
import {
  type QuestionReviewItem,
  type RecordActivityInput,
  formatInProgressSummary,
} from './studentProgress';
import { recordStudentActivity } from './studentProgressService';
import { BackLink } from './SubjectPage';

type ExamStage =
  | 'intro'
  | 'exam'
  | 'exam_report'
  | 'remediation'
  | 'remediation_report';

interface ExamAnswerEntry {
  questionId: string;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  review: QuestionReviewItem;
}

export default function IgMathG6ExamPage() {
  const { user, loading: authLoading, needsSSOSync, signInWithGoogle } = useAuth();
  const { profile, resolvedName, effectiveAvatarId } = useProfile();
  const { rewards, recordPractice } = useRewards();

  const userRef = useRef(user);
  userRef.current = user;
  const metaRef = useRef({ profile, resolvedName, effectiveAvatarId, rewards });
  metaRef.current = { profile, resolvedName, effectiveAvatarId, rewards };

  const [stage, setStage] = useState<ExamStage>('intro');
  const [paperSeq, setPaperSeq] = useState(0);

  // Stage 1: 20-question comprehensive exam
  const [examQuestions, setExamQuestions] = useState<IgMathG6ExamQuestion[]>([]);
  const [examAnswers, setExamAnswers] = useState<ExamAnswerEntry[]>([]);
  const [examDurationSec, setExamDurationSec] = useState<number | null>(null);
  const [examReward, setExamReward] = useState<ActivityRewardOutcome | null>(null);
  const [examSyncStatus, setExamSyncStatus] = useState<ActivitySyncState>('idle');

  // Stage 2: 10-question targeted remediation
  const [remQuestions, setRemQuestions] = useState<IgMathG6ExamQuestion[]>([]);
  const [remAnswers, setRemAnswers] = useState<ExamAnswerEntry[]>([]);
  const [remAllocation, setRemAllocation] = useState<RemediationAllocationItem[]>([]);
  const [remRound, setRemRound] = useState(0);
  const [remDurationSec, setRemDurationSec] = useState<number | null>(null);
  const [remReward, setRemReward] = useState<ActivityRewardOutcome | null>(null);
  const [remSyncStatus, setRemSyncStatus] = useState<ActivitySyncState>('idle');

  // Shared active runner UI state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [chosenOpt, setChosenOpt] = useState<number | null>(null);
  const [liveRecordedCount, setLiveRecordedCount] = useState(0);
  const [onlyWrongReview, setOnlyWrongReview] = useState(false);

  const sessionIdRef = useRef<string>(buildDeterministicActivityId('practice', Date.now()));
  const startedAtRef = useRef<number>(Date.now());
  const pendingFinalInputRef = useRef<RecordActivityInput | null>(null);
  const rewardsSnapshotRef = useRef<RewardsState | null>(null);
  const completedRef = useRef(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const isRunningExam = stage === 'exam';
  const activeQuestions = isRunningExam ? examQuestions : remQuestions;
  const activeAnswers = isRunningExam ? examAnswers : remAnswers;
  const activeTitle = isRunningExam
    ? 'IG Math · 六年级综合练习卷（20题）'
    : `IG Math · 六年级弱项针对强化（10题 #${Math.max(1, remRound)}）`;

  const syncFinalRecord = useCallback(
    async (
      mode: 'exam' | 'remediation',
      input: RecordActivityInput,
      rewardsState: RewardsState
    ) => {
      const setStatus = mode === 'exam' ? setExamSyncStatus : setRemSyncStatus;
      if (!user) {
        await recordStudentActivity(
          null,
          { profile, resolvedName, effectiveAvatarId, rewards: rewardsState },
          input
        );
        setStatus('guest');
        return;
      }
      setStatus('syncing');
      const persisted = await recordStudentActivity(
        user,
        { profile, resolvedName, effectiveAvatarId, rewards: rewardsState },
        input
      );
      setStatus(persisted ? 'synced' : 'error');
    },
    [user, profile, resolvedName, effectiveAvatarId]
  );

  // Re-sync pending final record if student signs in on a report screen
  useEffect(() => {
    if (!user || !pendingFinalInputRef.current) return;
    if (stage === 'exam_report' && examSyncStatus === 'guest') {
      void syncFinalRecord(
        'exam',
        pendingFinalInputRef.current,
        rewardsSnapshotRef.current ?? rewards
      );
    } else if (stage === 'remediation_report' && remSyncStatus === 'guest') {
      void syncFinalRecord(
        'remediation',
        pendingFinalInputRef.current,
        rewardsSnapshotRef.current ?? rewards
      );
    }
  }, [stage, user, examSyncStatus, remSyncStatus, syncFinalRecord, rewards]);

  const startComprehensiveExam = () => {
    const prevStems = examQuestions.map((q) => q.question);
    const freshPaper = generateIgMathG6ExamPaper(prevStems);
    const now = Date.now();
    sessionIdRef.current = buildDeterministicActivityId('practice', now);
    startedAtRef.current = now;
    pendingFinalInputRef.current = null;
    rewardsSnapshotRef.current = null;
    completedRef.current = false;

    setPaperSeq((n) => n + 1);
    setExamQuestions(freshPaper);
    setExamAnswers([]);
    setExamDurationSec(null);
    setExamReward(null);
    setExamSyncStatus('idle');
    setRemQuestions([]);
    setRemAnswers([]);
    setRemAllocation([]);
    setRemRound(0);
    setCurrentIdx(0);
    setChosenOpt(null);
    setLiveRecordedCount(0);
    setOnlyWrongReview(false);
    setStage('exam');
    window.scrollTo({ top: 0 });
  };

  const examDiagnostic = useMemo(
    () => analyzeExamPerformance(examQuestions, examAnswers),
    [examQuestions, examAnswers]
  );

  const previewRemediationPlan = useMemo(
    () => generateTargetedRemediationPaper(examQuestions, examAnswers, IG_MATH_G6_REMEDIATION_SIZE),
    [examQuestions, examAnswers]
  );

  const startTargetedRemediation = (
    sourceQuestions: readonly IgMathG6ExamQuestion[],
    sourceAnswers: readonly ExamAnswerEntry[]
  ) => {
    const plan = generateTargetedRemediationPaper(
      sourceQuestions,
      sourceAnswers,
      IG_MATH_G6_REMEDIATION_SIZE
    );
    const now = Date.now();
    sessionIdRef.current = buildDeterministicActivityId('practice', now);
    startedAtRef.current = now;
    pendingFinalInputRef.current = null;
    rewardsSnapshotRef.current = null;
    completedRef.current = false;

    setRemQuestions(plan.questions);
    setRemAllocation(plan.allocation);
    setRemAnswers([]);
    setRemDurationSec(null);
    setRemReward(null);
    setRemSyncStatus('idle');
    setRemRound((r) => r + 1);
    setCurrentIdx(0);
    setChosenOpt(null);
    setLiveRecordedCount(0);
    setOnlyWrongReview(false);
    setStage('remediation');
    window.scrollTo({ top: 0 });
  };

  const remDiagnostic = useMemo(
    () => analyzeExamPerformance(remQuestions, remAnswers),
    [remQuestions, remAnswers]
  );

  const chooseOption = (optIndex: number) => {
    if (chosenOpt !== null) return;
    const q = activeQuestions[currentIdx];
    if (!q) return;

    setChosenOpt(optIndex);
    const isCorrect = optIndex === q.answer;
    const userAns = q.options[optIndex] ?? '';
    const correctAns = q.options[q.answer] ?? '';
    const review: QuestionReviewItem = {
      question: q.question,
      userAnswer: userAns,
      correctAnswer: correctAns,
      isCorrect,
      category: q.topicLabel,
    };

    const nextEntry: ExamAnswerEntry = {
      questionId: q.id,
      isCorrect,
      userAnswer: userAns,
      correctAnswer: correctAns,
      review,
    };
    const nextAnswers = [...activeAnswers, nextEntry];

    if (isRunningExam) {
      setExamAnswers(nextAnswers);
    } else {
      setRemAnswers(nextAnswers);
    }

    if (!isCorrect) {
      recordLocalDailyMistake(userRef.current?.uid ?? null, {
        activityId: sessionIdRef.current,
        activityType: 'practice',
        subjectId: 'ig-math',
        activityTitle: activeTitle,
        grade: 'G6',
        isIncompleteSession: true,
        category: q.topicLabel,
        question: q.question,
        userAnswer: userAns,
        correctAnswer: correctAns,
      });
    }

    const correctCount = nextAnswers.filter((a) => a.isCorrect).length;
    const answeredCount = nextAnswers.length;
    setLiveRecordedCount(answeredCount);

    const { profile: p, resolvedName: rn, effectiveAvatarId: av, rewards: rw } = metaRef.current;
    void recordStudentActivity(
      userRef.current,
      { profile: p, resolvedName: rn, effectiveAvatarId: av, rewards: rw },
      {
        id: sessionIdRef.current,
        type: 'practice',
        subjectId: 'ig-math',
        title: activeTitle,
        grade: 'G6',
        score: correctCount,
        maxScore: activeQuestions.length,
        accuracyPct: Math.round((correctCount / answeredCount) * 100),
        durationSec: Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
        difficulty: isRunningExam ? 'mixed' : 'standard',
        summary: formatInProgressSummary({
          answered: answeredCount,
          total: activeQuestions.length,
          correct: correctCount,
        }),
        questionItems: nextAnswers.map((a) => a.review),
        createdAt: startedAtRef.current,
        isComplete: false,
      }
    );
  };

  const handleNext = () => {
    if (currentIdx + 1 < activeQuestions.length) {
      setCurrentIdx((i) => i + 1);
      setChosenOpt(null);
      window.scrollTo({ top: 0 });
      return;
    }

    if (completedRef.current) return;
    completedRef.current = true;

    const total = activeQuestions.length;
    const score = activeAnswers.filter((a) => a.isCorrect).length;
    const accuracyPct = total > 0 ? Math.round((score / total) * 100) : 0;
    const elapsedSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    const outcome = recordPractice(score, total);
    rewardsSnapshotRef.current = outcome.nextState;

    const diag = analyzeExamPerformance(activeQuestions, activeAnswers);
    const weakTopics = diag.weakTopicNames.slice(0, 10);

    if (isRunningExam) {
      setExamDurationSec(elapsedSec);
      setExamReward(outcome);
      const passed = accuracyPct >= IG_MATH_G6_PASS_THRESHOLD_PCT;
      const summary = `完成 20 题六年级综合卷，答对 ${score}/20 题（${accuracyPct}%）· ${
        passed ? '已达 80% 达标线' : '未达 80%，已触发 10 题重点强化'
      }`;
      const input: RecordActivityInput = {
        id: sessionIdRef.current,
        type: 'practice',
        subjectId: 'ig-math',
        title: activeTitle,
        grade: 'G6',
        score,
        maxScore: total,
        accuracyPct,
        durationSec: elapsedSec,
        difficulty: 'mixed',
        weakPoints: weakTopics,
        summary,
        questionItems: activeAnswers.map((a) => a.review),
        createdAt: startedAtRef.current,
        isComplete: true,
      };
      pendingFinalInputRef.current = input;
      setStage('exam_report');
      if (!authLoading) {
        void syncFinalRecord('exam', input, outcome.nextState);
      } else {
        setExamSyncStatus('guest');
      }
    } else {
      setRemDurationSec(elapsedSec);
      setRemReward(outcome);
      const summary = `完成 10 题弱项针对强化，答对 ${score}/10 题（${accuracyPct}%）`;
      const input: RecordActivityInput = {
        id: sessionIdRef.current,
        type: 'practice',
        subjectId: 'ig-math',
        title: activeTitle,
        grade: 'G6',
        score,
        maxScore: total,
        accuracyPct,
        durationSec: elapsedSec,
        difficulty: 'standard',
        weakPoints: weakTopics,
        summary,
        questionItems: activeAnswers.map((a) => a.review),
        createdAt: startedAtRef.current,
        isComplete: true,
      };
      pendingFinalInputRef.current = input;
      setStage('remediation_report');
      if (!authLoading) {
        void syncFinalRecord('remediation', input, outcome.nextState);
      } else {
        setRemSyncStatus('guest');
      }
    }
    window.scrollTo({ top: 0 });
  };

  // ===================================================================
  // Render: Intro Screen
  // ===================================================================
  if (stage === 'intro') {
    return (
      <>
        <BackLink href="#/s/ig-math" label="返回 IG Math" />

        <div className="chunky bg-sky-100 p-6 sm:p-7 mt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-0.5 rounded-full border-2 border-ink bg-yellow-300 text-xs font-black">
              六年级专项综合卷
            </span>
            <span className="px-3 py-0.5 rounded-full border-2 border-ink bg-white text-xs font-black">
              20 题测评 + 未达 80% 自动加练 10 题
            </span>
          </div>
          <h1 className="text-3xl font-black mt-3">IG Math 6 年级单元综合练习卷</h1>
          <p className="font-bold text-slate-700 mt-2 leading-relaxed text-sm sm:text-base">
            严格对照近期课堂练习册五大核心单元出题：每单元 4 题共 20 题。若综合正确率未达到{' '}
            <span className="text-rose-700 font-black">80%（16/20 题）</span>
            ，系统将自动按错题薄弱比例生成{' '}
            <span className="text-ink font-black underline">10 道全新针对性重点练习题</span>！
          </p>
        </div>

        <section aria-label="考察五大知识模块" className="mt-6">
          <h2 className="text-lg font-black mb-3">本卷涵盖五大核心单元（每项 4 题，数值每次动态变化）</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {IG_MATH_G6_EXAM_TOPICS.map((t) => (
              <li key={t.id} className="chunky bg-white p-4">
                <div className="flex items-center gap-2 font-black text-base">
                  <span aria-hidden="true">{t.emoji}</span>
                  <span>
                    {t.nameEn} · {t.nameZh}
                  </span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full border border-ink bg-sky-50 font-black">
                    4 题
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-600 mt-1.5 leading-relaxed">{t.tipZh}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-6 rounded-2xl border-2 border-ink bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-950 flex items-start gap-2">
          <ClipboardCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" aria-hidden="true" />
          <span>
            防刷题实时记录：每选完一题都会即时同步至家长督学看板与今日错题本；每次重新开卷都会生成新数字与新图形。
          </span>
        </div>

        <button
          type="button"
          onClick={startComprehensiveExam}
          className="chunky bg-yellow-300 hover:bg-yellow-400 w-full mt-6 py-4 text-xl font-black flex items-center justify-center gap-2"
        >
          🚀 开始 {IG_MATH_G6_EXAM_SIZE} 题综合练习卷
        </button>
      </>
    );
  }

  // ===================================================================
  // Render: Stage 1 (20 Qs) or Stage 2 (10 Qs) Active Runner
  // ===================================================================
  if (stage === 'exam' || stage === 'remediation') {
    const q = activeQuestions[currentIdx];
    if (!q) return null;
    const topicMeta = IG_MATH_G6_EXAM_TOPICS.find((t) => t.id === q.topicId);
    const answered = chosenOpt !== null;
    const correct = chosenOpt === q.answer;

    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <BackLink href="#/s/ig-math" label="退出" />
          <div className="flex items-center gap-2 mt-2">
            {liveRecordedCount > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 font-extrabold text-emerald-800">
                ☁️ 已实时记录 {liveRecordedCount} 题
              </span>
            )}
            <span className="font-extrabold text-slate-700 text-sm sm:text-base tabular-nums">
              {isRunningExam ? '综合卷' : '针对强化'} · {currentIdx + 1} / {activeQuestions.length}
            </span>
          </div>
        </div>

        {/* Question status strip */}
        <div className="flex gap-1 mt-4" aria-hidden="true">
          {activeQuestions.map((item, i) => {
            const doneEntry = activeAnswers[i];
            let barClass = 'bg-white';
            if (doneEntry) {
              barClass = doneEntry.isCorrect ? 'bg-emerald-400' : 'bg-rose-400';
            } else if (i === currentIdx) {
              barClass = 'bg-yellow-300';
            }
            return (
              <span
                key={item.id}
                className={`h-2.5 flex-1 rounded-full border border-ink ${barClass}`}
              />
            );
          })}
        </div>

        {/* Topic pills */}
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <span
            className={`px-3 py-0.5 rounded-full border-2 border-ink text-xs font-black ${
              isRunningExam ? 'bg-sky-100 text-sky-900' : 'bg-rose-100 text-rose-950'
            }`}
          >
            {isRunningExam ? '📝 20题综合测评' : '🎯 10题弱项重点强化'}
          </span>
          {topicMeta && (
            <span className="px-3 py-0.5 rounded-full border-2 border-ink bg-white text-xs font-black text-slate-800">
              {topicMeta.emoji} {topicMeta.nameEn} · {topicMeta.nameZh}
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded-full border border-slate-300 bg-slate-50 text-[11px] font-bold text-slate-600">
            {q.topicLabel}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black leading-snug mt-4">{q.question}</h1>

        {q.diagram && <ExamDiagram spec={q.diagram} />}

        <div className="grid gap-3 mt-5">
          {q.options.map((opt, i) => {
            const isAnswer = i === q.answer;
            const isChosen = i === chosenOpt;
            let style = 'bg-white';
            if (answered && isAnswer) style = 'bg-emerald-200';
            else if (answered && isChosen) style = 'bg-rose-200';

            return (
              <button
                key={i}
                type="button"
                onClick={() => chooseOption(i)}
                disabled={answered}
                className={`chunky ${style} px-5 py-4 text-left text-base sm:text-lg font-bold flex items-center gap-3 disabled:cursor-default`}
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
                <span className="min-w-0 break-words">{opt}</span>
              </button>
            );
          })}
        </div>

        <div aria-live="polite">
          {answered && (
            <div className="mt-6">
              <p className="text-2xl font-black">
                {correct ? '答对了！🎉' : `再仔细看下思路～ 正确答案是 ${String.fromCharCode(65 + q.answer)}`}
              </p>
              <p className="text-base font-semibold text-slate-700 mt-1.5 leading-relaxed">
                {q.explanation}
              </p>
              <button
                type="button"
                onClick={handleNext}
                className="chunky bg-yellow-300 hover:bg-yellow-400 w-full mt-5 py-4 text-xl font-black flex items-center justify-center gap-2"
              >
                {currentIdx + 1 < activeQuestions.length ? (
                  <>
                    下一题 <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </>
                ) : isRunningExam ? (
                  '提交 20 题综合卷并生成诊断报告 →'
                ) : (
                  '完成强化训练并查看提升对比 →'
                )}
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  // ===================================================================
  // Render: Stage 1 Report (20 Qs) OR Stage 2 Report (10 Qs)
  // ===================================================================
  const isExamReport = stage === 'exam_report';
  const reportDiag = isExamReport ? examDiagnostic : remDiagnostic;
  const reportQuestions = isExamReport ? examQuestions : remQuestions;
  const reportAnswers = isExamReport ? examAnswers : remAnswers;
  const reportDuration = isExamReport ? examDurationSec : remDurationSec;
  const reportReward = isExamReport ? examReward : remReward;
  const reportSyncStatus = isExamReport ? examSyncStatus : remSyncStatus;
  const wrongCount = reportAnswers.filter((a) => !a.isCorrect).length;
  const studentName = resolvedName || user?.displayName || '同学';

  const reviewRows = reportQuestions
    .map((q, idx) => ({
      index: idx + 1,
      question: q,
      answer: reportAnswers[idx],
    }))
    .filter((row) => !onlyWrongReview || !row.answer?.isCorrect);

  return (
    <>
      <BackLink href="#/s/ig-math" label="返回 IG Math" />

      <div ref={reportRef} className="mt-5 bg-white rounded-3xl border-[3px] border-ink p-5 sm:p-6">
        <div className="text-center">
          <p className="font-extrabold text-sky-800 text-sm">
            {isExamReport
              ? `IG Math · 六年级单元综合卷（20 题） · ${studentName}`
              : `IG Math · 弱项针对性重点强化（10 题 #${remRound}） · ${studentName}`}
          </p>

          <div className="mt-2 inline-grid place-items-center" aria-hidden="true">
            {reportDiag.passed80 ? (
              <Award className="w-12 h-12 text-emerald-600" />
            ) : (
              <Target className="w-12 h-12 text-rose-600" />
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            {isExamReport
              ? reportDiag.passed80
                ? '恭喜达标（≥ 80%）！🏆'
                : '未达 80% 达标线 — 请完成 10 题针对强化'
              : reportDiag.passed80
                ? '弱项专项强化达标！🎉'
                : '本轮 10 题强化已完成 💪'}
          </h1>

          <p className="text-5xl font-black mt-3 tabular-nums">
            {reportDiag.score}
            <span className="text-2xl text-slate-600"> / {reportDiag.total}</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-2.5 text-sm font-extrabold">
            <span
              className={`px-3 py-0.5 rounded-full border-2 border-ink font-black ${
                reportDiag.passed80 ? 'bg-emerald-200 text-emerald-950' : 'bg-rose-200 text-rose-950'
              }`}
            >
              正确率 {reportDiag.accuracyPct}%（目标 ≥ {IG_MATH_G6_PASS_THRESHOLD_PCT}%）
            </span>
            {reportDuration !== null && (
              <span className="px-3 py-0.5 rounded-full border-2 border-ink bg-slate-100 text-slate-800">
                用时 {reportDuration} 秒
              </span>
            )}
          </div>
        </div>

        {/* Stage 2 vs Stage 1 improvement banner */}
        {!isExamReport && (
          <div className="mt-5 rounded-2xl border-2 border-ink bg-sky-50 p-4 flex flex-wrap items-center justify-between gap-2 text-sm font-black">
            <span>
              综合初测（20 题）：<span className="tabular-nums">{examDiagnostic.score}/20（{examDiagnostic.accuracyPct}%）</span>
            </span>
            <span aria-hidden="true">→</span>
            <span className={reportDiag.accuracyPct > examDiagnostic.accuracyPct ? 'text-emerald-700' : 'text-sky-900'}>
              针对强化（10 题）：<span className="tabular-nums">{reportDiag.score}/10（{reportDiag.accuracyPct}%）</span>
            </span>
          </div>
        )}

        {/* Topic Breakdown Grid */}
        <div className="mt-6">
          <h2 className="text-base font-black mb-2.5">五大知识点分项诊断</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {reportDiag.topicStats
              .filter((st) => st.total > 0)
              .map((st) => {
                const isWeak = st.accuracyPct < IG_MATH_G6_PASS_THRESHOLD_PCT;
                return (
                  <div
                    key={st.topicId}
                    className={`rounded-2xl border-2 p-3 ${
                      isWeak ? 'border-rose-300 bg-rose-50/80' : 'border-emerald-300 bg-emerald-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-sm font-black">
                      <span>
                        {st.emoji} {st.nameEn}
                      </span>
                      <span className="tabular-nums">
                        {st.correct}/{st.total}（{st.accuracyPct}%）
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full border border-ink bg-white overflow-hidden mt-2">
                      <div
                        className={`h-full ${isWeak ? 'bg-rose-400' : 'bg-emerald-400'}`}
                        style={{ width: `${st.accuracyPct}%` }}
                      />
                    </div>
                    {isWeak && (
                      <p className="text-[11px] font-bold text-rose-900 mt-1.5">
                        📌 错 {st.wrongCount} 题 · {st.tipZh}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Mandatory <80% Remediation Callout in Stage 1 Report */}
        {isExamReport && !examDiagnostic.passed80 && (
          <div className="mt-6 rounded-2xl border-[3px] border-ink bg-amber-100 p-4 sm:p-5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-6 h-6 text-rose-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-ink">
                  正确率 {examDiagnostic.accuracyPct}% ＜ 80%，已定制 10 题针对性重点强化卷
                </h2>
                <p className="text-xs sm:text-sm font-bold text-slate-800 mt-1">
                  系统已根据你刚才做错的薄弱题型按比例配题，重新生成 10 道全新题：
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {previewRemediationPlan.allocation.map((item) => {
                    const meta = IG_MATH_G6_EXAM_TOPICS.find((t) => t.id === item.topicId);
                    return (
                      <span
                        key={item.topicId}
                        className="px-2.5 py-1 rounded-full border-2 border-ink bg-white text-xs font-black"
                      >
                        {meta?.emoji} {meta?.nameZh || item.topicId} {item.count} 题
                      </span>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => startTargetedRemediation(examQuestions, examAnswers)}
                  className="chunky bg-yellow-300 hover:bg-yellow-400 w-full mt-4 py-3.5 text-lg font-black flex items-center justify-center gap-2"
                >
                  🎯 立即开始 10 题针对性重点练习
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Question-by-Question Review List */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-base font-black">
              逐题解析明细（{reviewRows.length} 题）
            </h2>
            {wrongCount > 0 && (
              <button
                type="button"
                aria-pressed={onlyWrongReview}
                onClick={() => setOnlyWrongReview((v) => !v)}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 border-ink text-xs font-black ${
                  onlyWrongReview ? 'bg-rose-200 text-rose-950' : 'bg-white hover:bg-rose-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                {onlyWrongReview ? `只看错题 (${wrongCount}) ✓` : `只看错题 (${wrongCount})`}
              </button>
            )}
          </div>

          <ul className="space-y-2.5">
            {reviewRows.map(({ index, question, answer }) => {
              const ok = answer?.isCorrect === true;
              return (
                <li
                  key={question.id}
                  className={`rounded-2xl p-3.5 border-2 ${
                    ok ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 border-ink grid place-items-center ${
                        ok ? 'bg-emerald-300' : 'bg-rose-300'
                      }`}
                    >
                      {ok ? <Check className="w-3 h-3" aria-hidden="true" /> : <X className="w-3 h-3" aria-hidden="true" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="inline-block text-[11px] px-2 py-0.5 rounded-full border border-slate-300 bg-white font-bold text-slate-700 mb-1">
                        {question.topicLabel}
                      </span>
                      <p className="font-bold text-sm text-ink">
                        {index}. {question.question}
                      </p>
                      <p className="text-xs font-bold text-slate-700 mt-1">
                        你的作答：{answer?.userAnswer || '未作答'}
                        {!ok && (
                          <span className="ml-2 text-emerald-800 font-black">
                            正确答案：{question.options[question.answer]}
                          </span>
                        )}
                      </p>
                      {!ok && question.explanation && (
                        <p className="text-xs font-semibold text-slate-600 mt-1">{question.explanation}</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-center text-xs font-extrabold text-slate-500 mt-5 tracking-widest">
          K12.VANPOWER.LIVE
        </p>
      </div>

      <RewardBanner outcome={reportReward} />

      <ActivitySyncStatus
        status={reportSyncStatus}
        needsSSOSync={needsSSOSync}
        onSignIn={() => void signInWithGoogle()}
        onRetry={() => {
          if (pendingFinalInputRef.current) {
            void syncFinalRecord(
              isExamReport ? 'exam' : 'remediation',
              pendingFinalInputRef.current,
              rewardsSnapshotRef.current ?? rewards
            );
          }
        }}
      />

      {/* Action Buttons below Report */}
      <div className="grid sm:grid-cols-2 gap-3.5 mt-6">
        {isExamReport && examDiagnostic.passed80 && wrongCount > 0 && (
          <button
            type="button"
            onClick={() => startTargetedRemediation(examQuestions, examAnswers)}
            className="chunky bg-rose-100 hover:bg-rose-200 py-3.5 text-base font-black flex items-center justify-center gap-2 sm:col-span-2"
          >
            <Target className="w-5 h-5" aria-hidden="true" />
            虽已达标，仍可针对这 {wrongCount} 道错题加练 10 题
          </button>
        )}

        {!isExamReport && !remDiagnostic.passed80 && (
          <button
            type="button"
            onClick={() => startTargetedRemediation(remQuestions, remAnswers)}
            className="chunky bg-yellow-300 hover:bg-yellow-400 py-3.5 text-lg font-black flex items-center justify-center gap-2 sm:col-span-2"
          >
            <Target className="w-5 h-5" aria-hidden="true" />
            未达 80%，继续针对剩余错题再练 10 题
          </button>
        )}

        <button
          type="button"
          onClick={startComprehensiveExam}
          className={`chunky py-3.5 text-lg font-black flex items-center justify-center gap-2 ${
            isExamReport && !examDiagnostic.passed80 ? 'bg-white' : 'bg-yellow-300 hover:bg-yellow-400'
          }`}
        >
          <RotateCcw className="w-5 h-5" aria-hidden="true" /> 新开一套 20 题卷
        </button>

        <a href="#/s/ig-math" className="chunky bg-white py-3.5 text-lg font-black text-center">
          返回 IG Math
        </a>
      </div>

      <ReportActions
        reportRef={reportRef}
        subjectLabel={
          isExamReport
            ? 'IG Math · 六年级单元综合卷（20题）'
            : `IG Math · 弱项针对强化（10题 #${remRound}）`
        }
        scoreSummary={`${reportDiag.score}/${reportDiag.total} 题（${reportDiag.accuracyPct}%）`}
        filePrefix="K12-IGMath-G6-Exam"
        sessionKey={
          isExamReport
            ? `igmath-g6-exam-${paperSeq}`
            : `igmath-g6-exam-${paperSeq}-rem-${remRound}`
        }
      />
    </>
  );
}
