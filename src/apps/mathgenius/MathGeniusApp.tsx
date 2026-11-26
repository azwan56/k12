import { useCallback, useEffect, useRef, useState } from 'react';
import type { GradeLevel } from '../../data/k12Subjects';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useRewards } from '../../hooks/useRewards';
import type { ActivitySyncState } from '../../k12/ActivitySyncStatus';
import { recordLocalDailyMistake } from '../../k12/dailyMistakes';
import { buildDeterministicActivityId } from '../../k12/pendingActivityQueue';
import type { ActivityRewardOutcome, RewardsState } from '../../k12/rewards';
import { getRecentMathStems } from '../../k12/questionDedupe';
import {
  type QuestionReviewItem,
  type RecordActivityInput,
  formatInProgressSummary,
} from '../../k12/studentProgress';
import { recordStudentActivity, updateStudentActivityFeedback } from '../../k12/studentProgressService';
import {
  AppState,
  Question,
  UserAnswer,
  QuizResult,
  DifficultyLevel,
  StudentLearningProfile,
  GRADE_6_CATEGORIES,
  DIFFICULTY_CONFIGS,
} from './types';
import { generateMathQuestions, getFinalFeedbackStream } from './services/geminiService';
import { getLearningProfile, saveLearningProfile, recordQuizCompletion } from './services/learningProfileService';
import { useLanguage } from './hooks/useLanguage';
import WelcomeScreen from './components/WelcomeScreen';
import QuestionScreen, { AnswerResultPayload } from './components/QuestionScreen';
import ResultScreen from './components/ResultScreen';
import SignInScreen from './components/SignInScreen';
import { BackButton, Spinner } from './components/ui';

const BACK_HREF = '#/s/ig-math';

export default function MathGeniusApp({ grade }: { grade: GradeLevel }) {
  const { user, loading, needsSSOSync, signInWithGoogle } = useAuth();
  const { profile: portalProfile, resolvedName, effectiveAvatarId } = useProfile();
  const [language, setLanguage] = useLanguage();
  const [state, setState] = useState<AppState>(AppState.WELCOME);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [results, setResults] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [streamingFeedback, setStreamingFeedback] = useState<string>('');
  const [isFeedbackLoading, setIsFeedbackLoading] = useState<boolean>(false);
  const [rewardOutcome, setRewardOutcome] = useState<ActivityRewardOutcome | null>(null);
  const [syncStatus, setSyncStatus] = useState<ActivitySyncState>('idle');
  const { rewards, recordMathGenius } = useRewards();
  // Bumped whenever the user leaves a run, so late async results are ignored.
  const runRef = useRef(0);
  const lastActivityInputRef = useRef<RecordActivityInput | null>(null);
  const lastRewardsRef = useRef<RewardsState | null>(null);
  const streamingFeedbackRef = useRef<string>('');
  const sessionMetaRef = useRef<{ id: string; createdAt: number }>({
    id: buildDeterministicActivityId('mathgenius', Date.now()),
    createdAt: Date.now(),
  });
  const liveAnswersRef = useRef<(UserAnswer | undefined)[]>([]);
  const [liveCount, setLiveCount] = useState(0);

  // Student learning profile & adaptive state
  const [profile, setProfile] = useState<StudentLearningProfile>(() => getLearningProfile(user?.uid || 'guest'));
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(() => profile.currentDifficulty);
  const [adaptiveMode, setAdaptiveMode] = useState<boolean>(() => profile.adaptiveMode);

  useEffect(() => {
    const loaded = getLearningProfile(user?.uid || 'guest');
    setProfile(loaded);
    setDifficulty(loaded.currentDifficulty);
    setAdaptiveMode(loaded.adaptiveMode);
  }, [user?.uid]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state, currentQuestionIndex]);

  const handleSelectDifficulty = (newDiff: DifficultyLevel) => {
    setDifficulty(newDiff);
    const updated: StudentLearningProfile = { ...profile, currentDifficulty: newDiff };
    setProfile(updated);
    saveLearningProfile(updated);
  };

  const handleToggleAdaptiveMode = () => {
    const nextMode = !adaptiveMode;
    setAdaptiveMode(nextMode);
    const updated: StudentLearningProfile = { ...profile, adaptiveMode: nextMode };
    setProfile(updated);
    saveLearningProfile(updated);
  };

  const syncMathRound = useCallback(
    async (input: RecordActivityInput, rewardsState: RewardsState): Promise<string | null> => {
      if (!user) {
        setSyncStatus('guest');
        return null;
      }
      setSyncStatus('syncing');
      const id = await recordStudentActivity(
        user,
        {
          profile: portalProfile,
          resolvedName,
          effectiveAvatarId,
          rewards: rewardsState,
        },
        input
      );
      setSyncStatus(id ? 'synced' : 'error');
      return id;
    },
    [user, portalProfile, resolvedName, effectiveAvatarId]
  );

  const startNewQuiz = async (category: string = selectedCategory) => {
    const run = ++runRef.current;
    setState(AppState.LOADING);
    setError(null);
    setSyncStatus('idle');
    lastActivityInputRef.current = null;
    lastRewardsRef.current = null;
    streamingFeedbackRef.current = '';
    try {
      // Passes active difficulty, weak-point weighting, and recent stems to prevent repeats
      const newQuestions = await generateMathQuestions(
        language,
        category,
        difficulty,
        profile.weakCategories,
        getRecentMathStems(user?.uid, 20),
        user?.uid
      );
      if (run !== runRef.current) return;
      const now = Date.now();
      sessionMetaRef.current = {
        id: buildDeterministicActivityId('mathgenius', now),
        createdAt: now,
      };
      liveAnswersRef.current = [];
      setLiveCount(0);
      setQuestions(newQuestions);
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
      setResults(null);
      setStreamingFeedback('');
      setStartTime(now);
      setState(AppState.PRACTICE);
    } catch {
      if (run !== runRef.current) return;
      setError('出题失败了，再试一次吧。');
      setState(AppState.WELCOME);
    }
  };

  const finishQuiz = useCallback(
    async (allAnswers: UserAnswer[]) => {
      const run = runRef.current;
      const timeTaken = Date.now() - startTime;
      const testDate = new Date().toLocaleString();
      const score = allAnswers.filter((a) => a.isCorrect).length;

      // Record learning profile & compute adaptive progression
      const { updatedProfile, levelRecommendation, weakPointsIdentified } = recordQuizCompletion(profile, {
        score,
        totalQuestions: questions.length,
        answers: allAnswers,
        questions,
        difficulty,
        selectedCategory
      });

      setProfile(updatedProfile);
      if (updatedProfile.adaptiveMode && levelRecommendation.action !== 'maintained') {
        setDifficulty(levelRecommendation.newLevel);
      }

      setResults({
        score,
        totalQuestions: questions.length,
        feedback: '',
        answers: allAnswers,
        date: testDate,
        timeTaken,
        difficulty,
        levelRecommendation,
        weakPointsIdentified
      });
      const outcome = recordMathGenius(score, questions.length);
      setRewardOutcome(outcome);
      lastRewardsRef.current = outcome.nextState;
      setState(AppState.RESULTS);

      let activityPromise: Promise<string | null> | null = null;
      if (user) {
        const questionItems: QuestionReviewItem[] = allAnswers.map((a) => {
          const q = questions.find((item) => item.id === a.questionId);
          return {
            question: q?.question || '数学题',
            userAnswer: a.answer || '未作答',
            correctAnswer: q?.correctAnswer || '',
            isCorrect: a.isCorrect,
            attempts: a.attempts,
            usedHint: a.usedHint,
            category: q?.category,
          };
        });
        const weakPoints = weakPointsIdentified.map(
          (id) => GRADE_6_CATEGORIES.find((c) => c.id === id)?.labelZh || id
        );
        const categoryLabel =
          GRADE_6_CATEGORIES.find((c) => c.id === selectedCategory)?.labelZh || '综合练习';
        const diffLabel = DIFFICULTY_CONFIGS[difficulty]?.shortLabelZh || difficulty;
        const input: RecordActivityInput = {
          id: sessionMetaRef.current.id,
          type: 'mathgenius',
          subjectId: 'ig-math',
          title: `MathGenius · ${categoryLabel}（${diffLabel}）`,
          grade,
          score,
          maxScore: questions.length,
          durationSec: Math.max(1, Math.round(timeTaken / 1000)),
          difficulty,
          weakPoints,
          questionItems,
          summary: `完成 ${questions.length} 题，答对 ${score} 题（${diffLabel}难度）`,
          createdAt: sessionMetaRef.current.createdAt,
          isComplete: true,
        };
        lastActivityInputRef.current = input;
        activityPromise = syncMathRound(input, outcome.nextState).catch((err) => {
          console.warn('[MathGeniusApp] Failed to record activity:', err);
          return null;
        });
      }

      // Stream feedback in background
      setIsFeedbackLoading(true);
      let fullText = '';
      try {
        const stream = getFinalFeedbackStream(score, allAnswers, questions, language, selectedCategory, difficulty);
        for await (const chunk of stream) {
          if (run !== runRef.current) return;
          fullText += chunk;
          streamingFeedbackRef.current = fullText;
          setStreamingFeedback(fullText);
        }
        if (user && fullText.trim()) {
          if (lastActivityInputRef.current) {
            lastActivityInputRef.current = {
              ...lastActivityInputRef.current,
              aiFeedback: fullText.trim().slice(0, 3000),
            };
          }
          if (activityPromise) {
            const actId = await activityPromise;
            if (actId) {
              void updateStudentActivityFeedback(user, actId, fullText).catch(() => {});
            }
          }
        }
      } catch {
        if (run !== runRef.current) return;
        setStreamingFeedback(
          language === 'zh'
            ? '非常出色的努力！你已经完成了本次六年级数学挑战。'
            : "Excellent effort! You've completed the Grade 6 challenge."
        );
      } finally {
        if (run === runRef.current) setIsFeedbackLoading(false);
      }
    },
    [
      questions,
      startTime,
      language,
      selectedCategory,
      difficulty,
      profile,
      user,
      recordMathGenius,
      grade,
      syncMathRound,
    ]
  );

  const handleQuestionProgress = useCallback(
    (result: AnswerResultPayload) => {
      const question = questions[currentQuestionIndex];
      if (!question || questions.length === 0) return;

      const entry: UserAnswer = {
        questionId: question.id,
        answer: result.answer,
        isCorrect: result.isCorrect,
        attempts: result.attempts,
        firstAttemptAnswer: result.firstAttemptAnswer,
        secondAttemptAnswer: result.secondAttemptAnswer,
        usedHint: result.usedHint,
      };
      liveAnswersRef.current[currentQuestionIndex] = entry;
      const compactAnswers = liveAnswersRef.current.filter((a): a is UserAnswer => Boolean(a));
      const questionItems: QuestionReviewItem[] = compactAnswers.map((a) => {
        const q = questions.find((item) => item.id === a.questionId);
        return {
          question: q?.question || '数学题',
          userAnswer: a.answer || '未作答',
          correctAnswer: q?.correctAnswer || '',
          isCorrect: a.isCorrect,
          attempts: a.attempts,
          usedHint: a.usedHint,
          category: q?.category,
        };
      });

      const categoryLabel =
        GRADE_6_CATEGORIES.find((c) => c.id === selectedCategory)?.labelZh || '综合练习';
      const diffLabel = DIFFICULTY_CONFIGS[difficulty]?.shortLabelZh || difficulty;
      const title = `MathGenius · ${categoryLabel}（${diffLabel}）`;

      if (!result.isCorrect) {
        recordLocalDailyMistake(user?.uid ?? null, {
          activityId: sessionMetaRef.current.id,
          activityType: 'mathgenius',
          subjectId: 'ig-math',
          activityTitle: title,
          grade,
          isIncompleteSession: true,
          category: question.category,
          question: question.question,
          userAnswer: result.answer || '未作答',
          correctAnswer: question.correctAnswer,
        });
      }

      const correctCount = compactAnswers.filter((a) => a.isCorrect).length;
      const answeredCount = compactAnswers.length;
      setLiveCount(answeredCount);

      void recordStudentActivity(
        user,
        {
          profile: portalProfile,
          resolvedName,
          effectiveAvatarId,
          rewards,
        },
        {
          id: sessionMetaRef.current.id,
          type: 'mathgenius',
          subjectId: 'ig-math',
          title,
          grade,
          score: correctCount,
          maxScore: questions.length,
          accuracyPct: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0,
          durationSec: Math.max(1, Math.round((Date.now() - startTime) / 1000)),
          difficulty,
          weakPoints: [],
          questionItems,
          summary: formatInProgressSummary({
            answered: answeredCount,
            total: questions.length,
            correct: correctCount,
          }),
          createdAt: sessionMetaRef.current.createdAt,
          isComplete: false,
        }
      );
    },
    [
      questions,
      currentQuestionIndex,
      selectedCategory,
      difficulty,
      user,
      grade,
      portalProfile,
      resolvedName,
      effectiveAvatarId,
      rewards,
      startTime,
    ]
  );

  const handleAnswer = useCallback(
    (result: AnswerResultPayload) => {
      const question = questions[currentQuestionIndex];
      const newAnswer: UserAnswer = {
        questionId: question.id,
        answer: result.answer,
        isCorrect: result.isCorrect,
        attempts: result.attempts,
        firstAttemptAnswer: result.firstAttemptAnswer,
        secondAttemptAnswer: result.secondAttemptAnswer,
        usedHint: result.usedHint
      };
      const updatedAnswers = [...userAnswers, newAnswer];
      setUserAnswers(updatedAnswers);

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        finishQuiz(updatedAnswers);
      }
    },
    [currentQuestionIndex, questions, userAnswers, finishQuiz]
  );

  const resetQuiz = useCallback(() => {
    runRef.current++;
    setState(AppState.WELCOME);
    setStreamingFeedback('');
    setIsFeedbackLoading(false);
    setSyncStatus('idle');
    setLiveCount(0);
    liveAnswersRef.current = [];
    lastActivityInputRef.current = null;
    lastRewardsRef.current = null;
    streamingFeedbackRef.current = '';
  }, []);

  if (loading) return <Spinner label="加载中…" />;

  // The original app requires sign-in before generating questions (Cloud Functions).
  if (!user) {
    return <SignInScreen backHref={BACK_HREF} needsSSOSync={needsSSOSync} onSignIn={signInWithGoogle} />;
  }

  if (state === AppState.LOADING) {
    return (
      <>
        <BackButton onClick={resetQuiz} label="取消" />
        <Spinner label="正在出题…" />
      </>
    );
  }

  if (state === AppState.PRACTICE && questions.length > 0) {
    return (
      <QuestionScreen
        key={questions[currentQuestionIndex].id}
        question={questions[currentQuestionIndex]}
        index={currentQuestionIndex}
        total={questions.length}
        difficulty={difficulty}
        language={language}
        liveStatusText={liveCount > 0 ? `☁️ 已实时记录 ${liveCount} 题` : undefined}
        onProgress={handleQuestionProgress}
        onAnswer={handleAnswer}
        onQuit={resetQuiz}
      />
    );
  }

  if (state === AppState.RESULTS && results) {
    return (
      <ResultScreen
        results={{ ...results, feedback: streamingFeedback }}
        questions={questions}
        rewardOutcome={rewardOutcome}
        syncStatus={syncStatus}
        onRetrySync={() => {
          if (lastActivityInputRef.current) {
            void syncMathRound(lastActivityInputRef.current, lastRewardsRef.current ?? rewards);
          }
        }}
        isFeedbackLoading={isFeedbackLoading}
        language={language}
        onRetry={() => startNewQuiz(selectedCategory)}
        onDone={resetQuiz}
      />
    );
  }

  return (
    <WelcomeScreen
      grade={grade}
      backHref={BACK_HREF}
      language={language}
      onLanguage={setLanguage}
      selectedCategory={selectedCategory}
      onSelectCategory={setSelectedCategory}
      difficulty={difficulty}
      onSelectDifficulty={handleSelectDifficulty}
      adaptiveMode={adaptiveMode}
      onToggleAdaptiveMode={handleToggleAdaptiveMode}
      weakCategories={profile.weakCategories}
      totalQuizzesTaken={profile.totalQuizzesTaken}
      error={error}
      onStart={() => startNewQuiz(selectedCategory)}
    />
  );
}
