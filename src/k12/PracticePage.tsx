import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, X, RotateCcw, Sparkles, Zap } from 'lucide-react';
import {
  Subject,
  GradeLevel,
  PracticeDifficulty,
  PRACTICE_DIFFICULTY_META,
  gradeLabel,
} from '../data/k12Subjects';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useRewards } from '../hooks/useRewards';
import ActivitySyncStatus, { type ActivitySyncState } from './ActivitySyncStatus';
import { recordLocalDailyMistake } from './dailyMistakes';
import {
  DEFAULT_PRACTICE_ROUND_SIZE,
  type DynamicRoundResult,
  buildLocalDynamicRound,
  fetchDynamicPracticeRound,
} from './dynamicPracticeService';
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
import { THEME, replaceQuery } from './ui';
import { BackLink, DifficultyFilter, parseDifficultyFilter } from './SubjectPage';

const PRACTICE_ROUND_SIZE = DEFAULT_PRACTICE_ROUND_SIZE;

interface ReviewEntry extends QuestionReviewItem {
  explanation: string;
  difficulty?: PracticeDifficulty;
  topic?: string;
}

interface Props {
  subject: Subject;
  grade: GradeLevel;
  track: string | null;
  initialDifficulty?: string | null;
}

export default function PracticePage({ subject, grade, track, initialDifficulty }: Props) {
  const theme = THEME[subject.id];
  const tracks = subject.tracks?.[grade] ?? [];
  const activeTrack = tracks.find((t) => t.id === track) ?? tracks[0];

  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>(() =>
    parseDifficultyFilter(initialDifficulty)
  );
  const [round, setRound] = useState(0);
  const { user, loading: authLoading, needsSSOSync, signInWithGoogle } = useAuth();
  const { profile, resolvedName, effectiveAvatarId } = useProfile();
  const { rewards, recordPractice } = useRewards();
  const uidRef = useRef<string | undefined>(user?.uid);
  uidRef.current = user?.uid;
  const userRef = useRef(user);
  userRef.current = user;
  const metaRef = useRef({ profile, resolvedName, effectiveAvatarId, rewards });
  metaRef.current = { profile, resolvedName, effectiveAvatarId, rewards };

  const basePool = useMemo(
    () =>
      subject.questions.filter(
        (q) => q.grade === grade && (!activeTrack || q.track === activeTrack.id)
      ),
    [subject, grade, activeTrack?.id]
  );

  const hasDifficultyTiers = useMemo(
    () => basePool.some((q) => Boolean(q.difficulty)),
    [basePool]
  );

  const backParams = new URLSearchParams();
  if (activeTrack) backParams.set('t', activeTrack.id);
  if (hasDifficultyTiers && difficultyFilter !== 'all') backParams.set('d', difficultyFilter);
  const backQs = backParams.toString();
  const backHref = `#/s/${subject.id}${backQs ? `?${backQs}` : ''}`;

  const roundKey = `${subject.id}|${grade}|${activeTrack?.id || 'main'}|${difficultyFilter}|${round}`;
  const [poolDraw, setPoolDraw] = useState<DynamicRoundResult>(() => ({
    questions: [],
    totalPoolSize: basePool.length,
    dynamicCount: 0,
    aiCount: 0,
  }));
  const [loadingRound, setLoadingRound] = useState(false);
  const loadedKeyRef = useRef('');
  const requestSeqRef = useRef(0);

  const buildLocalRoundNow = useCallback(
    () =>
      buildLocalDynamicRound({
        subject,
        grade,
        trackId: activeTrack?.id,
        trackName: activeTrack?.nameZh,
        topics: activeTrack?.topics ?? subject.topics[grade],
        difficulty: difficultyFilter,
        count: PRACTICE_ROUND_SIZE,
        uid: uidRef.current,
      }),
    [subject, grade, activeTrack, difficultyFilter]
  );

  useEffect(() => {
    if (authLoading) return;
    if (loadedKeyRef.current === roundKey) return;
    loadedKeyRef.current = roundKey;
    const reqId = ++requestSeqRef.current;

    const shouldTryAi =
      Boolean(uidRef.current) &&
      (subject.id === 'english' || subject.id === 'humanity' || subject.id === 'science');

    if (!shouldTryAi) {
      setLoadingRound(false);
      setPoolDraw(buildLocalRoundNow());
      return;
    }

    setLoadingRound(true);
    void fetchDynamicPracticeRound({
      subject,
      grade,
      trackId: activeTrack?.id,
      trackName: activeTrack?.nameZh,
      topics: activeTrack?.topics ?? subject.topics[grade],
      difficulty: difficultyFilter,
      count: PRACTICE_ROUND_SIZE,
      uid: uidRef.current,
    })
      .then((res) => {
        if (reqId !== requestSeqRef.current) return;
        setPoolDraw(res);
        setLoadingRound(false);
      })
      .catch(() => {
        if (reqId !== requestSeqRef.current) return;
        setPoolDraw(buildLocalRoundNow());
        setLoadingRound(false);
      });
  }, [authLoading, roundKey, subject, grade, activeTrack, difficultyFilter, buildLocalRoundNow]);

  const skipAiLoading = () => {
    requestSeqRef.current += 1;
    setLoadingRound(false);
    setPoolDraw(buildLocalRoundNow());
  };

  const switchDifficulty = (nextDiff: DifficultyFilter) => {
    if (nextDiff === difficultyFilter) return;
    loadedKeyRef.current = '';
    setDifficultyFilter(nextDiff);
    setRound(0);
    const params: Record<string, string> = {};
    if (activeTrack) params.t = activeTrack.id;
    if (nextDiff !== 'all') params.d = nextDiff;
    replaceQuery(['s', subject.id, 'practice'], params);
  };

  const questions = poolDraw.questions;

  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [rewardOutcome, setRewardOutcome] = useState<ActivityRewardOutcome | null>(null);
  const [reviewList, setReviewList] = useState<ReviewEntry[]>([]);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<ActivitySyncState>('idle');
  const [liveRecordedCount, setLiveRecordedCount] = useState(0);
  const awardedRef = useRef(false);
  const answersRef = useRef<QuestionReviewItem[]>([]);
  const startedAtRef = useRef(Date.now());
  const sessionIdRef = useRef(buildDeterministicActivityId('practice', startedAtRef.current));
  const pendingInputRef = useRef<RecordActivityInput | null>(null);
  const rewardsStateRef = useRef<RewardsState | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const restart = () => {
    const now = Date.now();
    setIndex(0);
    setChosen(null);
    setScore(0);
    setRewardOutcome(null);
    setReviewList([]);
    setDurationSec(null);
    setSyncStatus('idle');
    setLiveRecordedCount(0);
    awardedRef.current = false;
    answersRef.current = [];
    startedAtRef.current = now;
    sessionIdRef.current = buildDeterministicActivityId('practice', now);
    pendingInputRef.current = null;
    rewardsStateRef.current = null;
  };

  useEffect(restart, [questions]);

  const finished = questions.length > 0 && index >= questions.length;
  const difficultySummaryLabel = hasDifficultyTiers
    ? difficultyFilter === 'all'
      ? '智能混合'
      : PRACTICE_DIFFICULTY_META[difficultyFilter].label
    : null;

  const syncCurrentRound = useCallback(
    async (input: RecordActivityInput, rewardsState: RewardsState) => {
      if (!user) {
        await recordStudentActivity(
          null,
          { profile, resolvedName, effectiveAvatarId, rewards: rewardsState },
          input
        );
        setSyncStatus('guest');
        return;
      }
      setSyncStatus('syncing');
      const id = await recordStudentActivity(
        user,
        { profile, resolvedName, effectiveAvatarId, rewards: rewardsState },
        input
      );
      setSyncStatus(id ? 'synced' : 'error');
    },
    [user, profile, resolvedName, effectiveAvatarId]
  );

  useEffect(() => {
    if (finished && !awardedRef.current && !authLoading) {
      awardedRef.current = true;
      const outcome = recordPractice(score, questions.length);
      setRewardOutcome(outcome);
      rewardsStateRef.current = outcome.nextState;
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      setDurationSec(elapsedSec);

      const accuracyPct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
      const trackTitle = activeTrack ? ` · ${activeTrack.nameZh}` : '';
      const diffTitle = difficultySummaryLabel ? ` · ${difficultySummaryLabel}` : '';
      const input: RecordActivityInput = {
        id: sessionIdRef.current,
        type: 'practice',
        subjectId: subject.id,
        title: `${subject.name}${trackTitle} · ${gradeLabel(grade)}${diffTitle}练习`,
        grade,
        score,
        maxScore: questions.length,
        accuracyPct,
        durationSec: elapsedSec,
        difficulty: hasDifficultyTiers
          ? difficultyFilter === 'all'
            ? 'mixed'
            : difficultyFilter
          : null,
        summary: `完成 ${questions.length} 题，答对 ${score} 题（正确率 ${accuracyPct}%）`,
        questionItems: [...answersRef.current],
        createdAt: startedAtRef.current,
        isComplete: true,
      };
      pendingInputRef.current = input;
      void syncCurrentRound(input, outcome.nextState);
    }
  }, [
    finished,
    authLoading,
    score,
    questions.length,
    recordPractice,
    subject.id,
    subject.name,
    activeTrack,
    grade,
    hasDifficultyTiers,
    difficultyFilter,
    difficultySummaryLabel,
    syncCurrentRound,
  ]);

  useEffect(() => {
    if (finished && user && syncStatus === 'guest' && pendingInputRef.current) {
      void syncCurrentRound(pendingInputRef.current, rewardsStateRef.current ?? rewards);
    }
  }, [finished, user, syncStatus, syncCurrentRound, rewards]);

  if (loadingRound) {
    return (
      <>
        <BackLink href={backHref} />
        <div className="chunky bg-amber-50 p-8 mt-6 text-center">
          <div className="text-4xl mb-3" aria-hidden="true">
            ✨
          </div>
          <h1 className="text-2xl font-black flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-600 animate-pulse" aria-hidden="true" />
            正在为本轮实时生成新题…
          </h1>
          <p className="font-bold text-slate-600 mt-2 text-sm">
            每次练习都会动态变化情境与数值，避免固定背答案，请稍候几秒。
          </p>
          <button
            type="button"
            onClick={skipAiLoading}
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-ink bg-white hover:bg-yellow-100 text-xs font-black"
          >
            <Zap className="w-3.5 h-3.5" aria-hidden="true" />
            跳过等待，立即用本地新题开始
          </button>
        </div>
      </>
    );
  }

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
    const accuracyPct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const studentName = resolvedName || user?.displayName || '同学';
    const subjectTitle = `${subject.name}${activeTrack ? ` · ${activeTrack.nameZh}` : ''}`;

    return (
      <>
        <BackLink href={backHref} />

        {/* Screenshot-ready Report Card */}
        <div ref={reportRef} className="mt-6 bg-white rounded-3xl border-[3px] border-ink p-6">
          <div className="text-center">
            <p className={`font-extrabold ${theme.text}`}>
              {subjectTitle} · {gradeLabel(grade)}
              {difficultySummaryLabel ? ` · ${difficultySummaryLabel}` : ''} · {studentName}
            </p>
            <h1 className="text-3xl font-black mt-1">
              {perfect ? '全对通关！🏆' : '练习完成！'}
            </h1>
            <p className="text-5xl font-black mt-4 tabular-nums">
              {score}
              <span className="text-2xl text-slate-600"> / {questions.length}</span>
            </p>
            <p className="text-sm font-extrabold text-slate-600 mt-2">
              正确率 {accuracyPct}%
              {durationSec !== null && ` · 用时 ${durationSec} 秒`}
              {poolDraw.totalPoolSize > questions.length && ` · 当前题库 ${poolDraw.totalPoolSize} 题`}
            </p>
          </div>

          <ul className="mt-6 space-y-2.5">
            {reviewList.map((item, i) => {
              const diffMeta = item.difficulty ? PRACTICE_DIFFICULTY_META[item.difficulty] : null;
              return (
                <li
                  key={i}
                  className={`rounded-2xl p-3.5 border-2 ${
                    item.isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 border-ink grid place-items-center ${
                        item.isCorrect ? 'bg-emerald-300' : 'bg-rose-300'
                      }`}
                    >
                      {item.isCorrect ? (
                        <Check className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <X className="w-3 h-3" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      {(diffMeta || item.topic) && (
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          {diffMeta && (
                            <span className={`text-[11px] px-2 py-0.5 rounded-full border border-ink font-black ${diffMeta.badgeClass}`}>
                              {diffMeta.emoji} {diffMeta.shortLabel}
                            </span>
                          )}
                          {item.topic && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-300 bg-white font-bold text-slate-700">
                              {item.topic}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="font-bold text-sm text-ink">{i + 1}. {item.question}</p>
                      <p className="text-xs font-bold text-slate-700 mt-1">
                        你的作答：{item.userAnswer}
                        {!item.isCorrect && (
                          <span className="ml-2 text-emerald-800 font-black">
                            正确答案：{item.correctAnswer}
                          </span>
                        )}
                      </p>
                      {!item.isCorrect && item.explanation && (
                        <p className="text-xs font-semibold text-slate-600 mt-1">{item.explanation}</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-center text-xs font-extrabold text-slate-500 mt-5 tracking-widest">
            K12.VANPOWER.LIVE
          </p>
        </div>

        <RewardBanner outcome={rewardOutcome} />

        <ActivitySyncStatus
          status={syncStatus}
          needsSSOSync={needsSSOSync}
          onSignIn={() => void signInWithGoogle()}
          onRetry={() => {
            if (pendingInputRef.current) {
              void syncCurrentRound(pendingInputRef.current, rewardsStateRef.current ?? rewards);
            }
          }}
        />

        <div className="grid grid-cols-2 gap-4 mt-6">
          <button
            type="button"
            onClick={() => setRound((r) => r + 1)}
            className="chunky bg-yellow-300 py-4 text-xl font-black flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" aria-hidden="true" /> 再来一组
          </button>
          <a href={backHref} className="chunky bg-white py-4 text-xl font-black text-center">
            完成
          </a>
        </div>

        <ReportActions
          reportRef={reportRef}
          subjectLabel={`${subjectTitle}（${gradeLabel(grade)}${difficultySummaryLabel ? `·${difficultySummaryLabel}` : ''}）`}
          scoreSummary={`${score}/${questions.length} 题（${accuracyPct}%）`}
          filePrefix={`K12-${subject.id}`}
          sessionKey={`practice-${subject.id}-${grade}-${activeTrack?.id || 'main'}-${difficultyFilter}-${round}`}
        />
      </>
    );
  }

  const q = questions[index];
  const answered = chosen !== null;
  const correct = chosen === q.answer;
  const qDiffMeta = q.difficulty ? PRACTICE_DIFFICULTY_META[q.difficulty] : null;

  const choose = (i: number) => {
    if (answered) return;
    setChosen(i);
    if (i === q.answer) setScore((s) => s + 1);
    const entry: QuestionReviewItem = {
      question: q.question,
      userAnswer: q.options[i] ?? '',
      correctAnswer: q.options[q.answer] ?? '',
      isCorrect: i === q.answer,
      ...(q.topic || activeTrack?.nameZh ? { category: q.topic || activeTrack?.nameZh } : {}),
    };
    const nextAnswers = [...answersRef.current, entry];
    answersRef.current = nextAnswers;
    const nextScore = nextAnswers.filter((a) => a.isCorrect).length;
    setReviewList((prev) => [
      ...prev,
      { ...entry, explanation: q.explanation, difficulty: q.difficulty, topic: q.topic },
    ]);

    const trackTitle = activeTrack ? ` · ${activeTrack.nameZh}` : '';
    const diffTitle = difficultySummaryLabel ? ` · ${difficultySummaryLabel}` : '';
    const title = `${subject.name}${trackTitle} · ${gradeLabel(grade)}${diffTitle}练习`;

    if (!entry.isCorrect) {
      recordLocalDailyMistake(userRef.current?.uid ?? null, {
        activityId: sessionIdRef.current,
        activityType: 'practice',
        subjectId: subject.id,
        activityTitle: title,
        grade,
        isIncompleteSession: true,
        category: entry.category,
        question: entry.question,
        userAnswer: entry.userAnswer,
        correctAnswer: entry.correctAnswer,
      });
    }

    const answeredCount = nextAnswers.length;
    const accuracyPct = Math.round((nextScore / answeredCount) * 100);
    setLiveRecordedCount(answeredCount);
    const { profile: curProfile, resolvedName: curName, effectiveAvatarId: curAvatar, rewards: curRewards } =
      metaRef.current;
    void recordStudentActivity(
      userRef.current,
      {
        profile: curProfile,
        resolvedName: curName,
        effectiveAvatarId: curAvatar,
        rewards: curRewards,
      },
      {
        id: sessionIdRef.current,
        type: 'practice',
        subjectId: subject.id,
        title,
        grade,
        score: nextScore,
        maxScore: questions.length,
        accuracyPct,
        durationSec: Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
        difficulty: hasDifficultyTiers
          ? difficultyFilter === 'all'
            ? 'mixed'
            : difficultyFilter
          : null,
        summary: formatInProgressSummary({
          answered: answeredCount,
          total: questions.length,
          correct: nextScore,
        }),
        questionItems: nextAnswers,
        createdAt: startedAtRef.current,
        isComplete: false,
      }
    );
  };

  const next = () => {
    setChosen(null);
    setIndex((i) => i + 1);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BackLink href={backHref} />
        <div className="flex items-center gap-2 mt-2">
          {liveRecordedCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 font-extrabold text-emerald-800">
              ☁️ 已实时记录 {liveRecordedCount} 题
            </span>
          )}
          <span className="font-extrabold text-slate-600 text-sm sm:text-base tabular-nums">
            {poolDraw.totalPoolSize > questions.length ? `题库 ${poolDraw.totalPoolSize} 题 · ` : ''}
            {index + 1} / {questions.length}
          </span>
        </div>
      </div>

      {/* Inline Difficulty Tier Switcher */}
      {hasDifficultyTiers && (
        <div role="group" aria-label="切换练习难度" className="flex flex-wrap gap-1.5 mt-3">
          <button
            type="button"
            aria-pressed={difficultyFilter === 'all'}
            onClick={() => switchDifficulty('all')}
            className={`px-3 py-1 rounded-full border-2 border-ink text-xs font-black transition-colors ${
              difficultyFilter === 'all' ? 'bg-yellow-300' : 'bg-white hover:bg-yellow-50'
            }`}
          >
            🎯 智能混合
          </button>
          {(['foundation', 'standard', 'challenge'] as PracticeDifficulty[]).map((tier) => {
            const meta = PRACTICE_DIFFICULTY_META[tier];
            const active = difficultyFilter === tier;
            return (
              <button
                key={tier}
                type="button"
                aria-pressed={active}
                onClick={() => switchDifficulty(tier)}
                className={`px-3 py-1 rounded-full border-2 border-ink text-xs font-black transition-colors ${
                  active ? meta.badgeClass : 'bg-white hover:bg-yellow-50'
                }`}
              >
                {meta.emoji} {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Progress dots */}
      <div className="flex gap-2 mt-4" aria-hidden="true">
        {questions.map((_, i) => (
          <span
            key={i}
            className={`h-3 flex-1 rounded-full border-2 border-ink ${i < index ? theme.solid : i === index ? 'bg-yellow-300' : 'bg-white'}`}
          />
        ))}
      </div>

      {(qDiffMeta || q.topic || q.dynamicSource) && (
        <div className="flex flex-wrap items-center gap-2 mt-6">
          {qDiffMeta && (
            <span className={`px-3 py-0.5 rounded-full border-2 border-ink text-xs font-black ${qDiffMeta.badgeClass}`}>
              {qDiffMeta.emoji} {qDiffMeta.label}
            </span>
          )}
          {q.topic && (
            <span className="px-3 py-0.5 rounded-full border-2 border-ink bg-white text-xs font-extrabold text-slate-700">
              {q.topic}
            </span>
          )}
          {q.dynamicSource === 'ai' && (
            <span className="px-2.5 py-0.5 rounded-full border-2 border-amber-500 bg-amber-50 text-[11px] font-black text-amber-900">
              ✨ AI 实时新题
            </span>
          )}
          {q.dynamicSource === 'procedural' && (
            <span className="px-2.5 py-0.5 rounded-full border-2 border-violet-500 bg-violet-50 text-[11px] font-black text-violet-900">
              🎲 动态变式新题
            </span>
          )}
        </div>
      )}

      <h1 className={`text-2xl sm:text-3xl font-black leading-snug ${qDiffMeta || q.topic || q.dynamicSource ? 'mt-4' : 'mt-8'}`}>
        {q.question}
      </h1>

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
