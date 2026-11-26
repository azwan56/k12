import { useCallback, useEffect, useRef, useState } from 'react';
import { LogIn } from 'lucide-react';
import type { GradeLevel } from '../../data/k12Subjects';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useRewards } from '../../hooks/useRewards';
import ActivitySyncStatus, { type ActivitySyncState } from '../../k12/ActivitySyncStatus';
import { recordLocalDailyMistake } from '../../k12/dailyMistakes';
import type { ActivityRewardOutcome, RewardsState } from '../../k12/rewards';
import {
  type RecordActivityInput,
  type WordsmithReviewItem,
  formatInProgressSummary,
} from '../../k12/studentProgress';
import { recordStudentActivity } from '../../k12/studentProgressService';
import { isCnRegion } from '../../lib/region';
import { BackLink } from '../../k12/SubjectPage';
import StartScreen from './components/StartScreen';
import CustomWordInput from './components/CustomWordInput';
import PlayScreen from './components/PlayScreen';
import FeedbackScreen from './components/FeedbackScreen';
import BatchSummary from './components/BatchSummary';
import { Spinner } from './components/ui';
import { getWordBatch, createCustomBatch, evaluateSentence } from './services/geminiService';
import { saveSession, getUserHistory, clearUserHistory } from './services/storageService';
import { WordChallenge, EvaluationResult, BatchResult, SessionRecord } from './types';

const DEFAULT_BATCH_SIZE = 10;

type AppState = 'menu' | 'custom-input' | 'playing' | 'summary';

export default function WordsmithApp({ grade }: { grade: GradeLevel }) {
  void grade; // reserved for future grade-specific word banks

  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { profile, resolvedName, effectiveAvatarId } = useProfile();
  const userName = user
    ? profile.displayName || user.displayName?.split(' ')[0] || resolvedName || 'Student'
    : '';

  const [appState, setAppState] = useState<AppState>('menu');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [wordBatch, setWordBatch] = useState<WordChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<EvaluationResult | null>(null);
  const [currentSentence, setCurrentSentence] = useState('');
  const [rewardOutcome, setRewardOutcome] = useState<ActivityRewardOutcome | null>(null);
  const [syncStatus, setSyncStatus] = useState<ActivitySyncState>('idle');
  const { rewards, recordWordsmith } = useRewards();
  const batchStartRef = useRef(Date.now());
  const sessionRawIdRef = useRef(String(batchStartRef.current));
  const sessionIdRef = useRef(`ws_${sessionRawIdRef.current}`);
  const batchResultsRef = useRef<BatchResult[]>([]);
  const lastActivityInputRef = useRef<RecordActivityInput | null>(null);
  const lastRewardsRef = useRef<RewardsState | null>(null);

  const syncWordsmithBatch = useCallback(
    async (input: RecordActivityInput, rewardsState: RewardsState) => {
      if (!user) {
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

  // Load this user's history on login / user change
  useEffect(() => {
    if (user) {
      setHistory(getUserHistory(user.uid));
      setAppState('menu');
    } else {
      setHistory([]);
    }
  }, [user?.uid]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [appState, currentIndex, currentEvaluation]);

  const resetBatch = () => {
    const now = Date.now();
    batchStartRef.current = now;
    sessionRawIdRef.current = String(now);
    sessionIdRef.current = `ws_${now}`;
    batchResultsRef.current = [];
    setBatchResults([]);
    setCurrentIndex(0);
    setCurrentEvaluation(null);
    setCurrentSentence('');
    setSyncStatus('idle');
    lastActivityInputRef.current = null;
    lastRewardsRef.current = null;
  };

  const goToMenu = () => {
    setAppState('menu');
    setWordBatch([]);
    resetBatch();
    setIsCustomMode(false);
  };

  const quitBatch = () => {
    if (batchResults.length === 0 || window.confirm('确定退出本组吗？已完成的造句会自动记录。')) {
      goToMenu();
    }
  };

  const startRandomBatch = async () => {
    setIsLoading(true);
    setIsCustomMode(false);
    resetBatch();
    try {
      const practicedWords = history.flatMap((s) => s.results.map((r) => r.wordChallenge.word));
      const batch = await getWordBatch(DEFAULT_BATCH_SIZE, {
        uid: user?.uid,
        practicedWords,
      });
      setWordBatch(batch);
      setAppState('playing');
    } catch (error) {
      console.error('Failed to load batch', error);
      goToMenu();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomWordsSubmit = async (words: string[]) => {
    setIsLoading(true);
    try {
      const batch = await createCustomBatch(words);
      if (batch.length > 0) {
        setIsCustomMode(true);
        setWordBatch(batch);
        resetBatch();
        setAppState('playing');
      }
    } catch (error) {
      console.error('Failed to process custom words', error);
    } finally {
      setIsLoading(false);
    }
  };

  const evaluateAndRecord = async (sentence: string) => {
    const currentWord = wordBatch[currentIndex];
    if (!currentWord || !sentence || isEvaluating) return;
    setIsEvaluating(true);
    setCurrentSentence(sentence);
    try {
      const result = await evaluateSentence(currentWord.word, sentence);
      setCurrentEvaluation(result);
      const entry: BatchResult = { wordChallenge: currentWord, userSentence: sentence, evaluation: result };
      const prev = batchResultsRef.current;
      const nextResults =
        prev.length > currentIndex
          ? prev.map((item, idx) => (idx === currentIndex ? entry : item))
          : [...prev, entry];
      batchResultsRef.current = nextResults;
      setBatchResults(nextResults);

      const title = isCustomMode ? 'Wordsmith · 自定义词单造句' : 'Wordsmith · 随机词汇造句';
      if (!result.isFallback && result.score <= 2) {
        recordLocalDailyMistake(user?.uid ?? null, {
          activityId: sessionIdRef.current,
          activityType: 'wordsmith',
          subjectId: 'english',
          activityTitle: title,
          grade: profile.grade,
          isIncompleteSession: true,
          category: currentWord.partOfSpeech ? `Wordsmith · ${currentWord.partOfSpeech}` : 'Wordsmith 造句',
          question: `Wordsmith 造句词：${currentWord.word}`,
          userAnswer: sentence,
          correctAnswer: result.correction || '请结合老师点评重新造句',
          kind: 'wordsmith',
          wordScore: result.score,
          wordFeedback: result.feedback,
          wordCorrection: result.correction ?? null,
        });
      }

      if (user) {
        const wordItems: WordsmithReviewItem[] = nextResults.map((r) => ({
          word: r.wordChallenge.word,
          partOfSpeech: r.wordChallenge.partOfSpeech,
          userSentence: r.userSentence,
          score: r.evaluation.score,
          feedback: r.evaluation.feedback,
          correction: r.evaluation.correction ?? null,
          isFallback: Boolean(r.evaluation.isFallback),
        }));
        const scoredResults = nextResults.filter((r) => !r.evaluation.isFallback);
        const totalStarsSoFar = scoredResults.reduce((acc, r) => acc + r.evaluation.score, 0);
        const maxStarsSoFar = nextResults.length * 5;
        const totalTargetWords = wordBatch.length || DEFAULT_BATCH_SIZE;
        void recordStudentActivity(
          user,
          { profile, resolvedName, effectiveAvatarId, rewards },
          {
            id: sessionIdRef.current,
            type: 'wordsmith',
            subjectId: 'english',
            title,
            grade: profile.grade,
            score: totalStarsSoFar,
            maxScore: totalTargetWords * 5,
            accuracyPct: maxStarsSoFar > 0 ? Math.round((totalStarsSoFar / maxStarsSoFar) * 100) : 0,
            durationSec: Math.max(1, Math.round((Date.now() - batchStartRef.current) / 1000)),
            summary: formatInProgressSummary({
              answered: nextResults.length,
              total: totalTargetWords,
              correct: totalStarsSoFar,
              unit: 'word',
              maxStarsSoFar,
            }),
            wordItems,
            createdAt: batchStartRef.current,
            isComplete: false,
          }
        );
      }
    } catch (error) {
      console.error('Failed to evaluate', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSentenceSubmit = (sentence: string) => {
    void evaluateAndRecord(sentence);
  };

  const handleRetryEvaluation = () => {
    void evaluateAndRecord(currentSentence);
  };

  const handleNext = () => {
    if (currentIndex < wordBatch.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setCurrentEvaluation(null);
      setCurrentSentence('');
    } else {
      const finalResults = batchResultsRef.current.length > 0 ? batchResultsRef.current : batchResults;
      if (user) {
        const newSession: SessionRecord = {
          id: sessionRawIdRef.current,
          userId: user.uid,
          timestamp: batchStartRef.current,
          mode: isCustomMode ? 'custom' : 'random',
          results: finalResults
        };
        setHistory(saveSession(newSession));
      }
      const scoredResults = finalResults.filter((r) => !r.evaluation.isFallback);
      const totalStars = scoredResults.reduce((acc, r) => acc + r.evaluation.score, 0);
      const outcome = scoredResults.length > 0 ? recordWordsmith(totalStars) : null;
      setRewardOutcome(outcome);

      if (user) {
        const wordItems: WordsmithReviewItem[] = finalResults.map((r) => ({
          word: r.wordChallenge.word,
          partOfSpeech: r.wordChallenge.partOfSpeech,
          userSentence: r.userSentence,
          score: r.evaluation.score,
          feedback: r.evaluation.feedback,
          correction: r.evaluation.correction ?? null,
          isFallback: Boolean(r.evaluation.isFallback),
        }));
        const maxStars = finalResults.length * 5;
        const accuracyPct = maxStars > 0 ? Math.round((totalStars / maxStars) * 100) : 0;
        const durationSec = Math.max(1, Math.round((Date.now() - batchStartRef.current) / 1000));
        const nextRewards = outcome ? outcome.nextState : rewards;
        const input: RecordActivityInput = {
          id: sessionIdRef.current,
          type: 'wordsmith',
          subjectId: 'english',
          title: isCustomMode ? 'Wordsmith · 自定义词单造句' : 'Wordsmith · 随机词汇造句',
          grade: profile.grade,
          score: totalStars,
          maxScore: maxStars,
          accuracyPct,
          durationSec,
          summary: `完成 ${finalResults.length} 个单词造句，获 ${totalStars}/${maxStars} 星`,
          wordItems,
          createdAt: batchStartRef.current,
          isComplete: true,
        };
        lastActivityInputRef.current = input;
        lastRewardsRef.current = nextRewards;
        void syncWordsmithBatch(input, nextRewards);
      }

      setAppState('summary');
    }
  };

  const handleClearHistory = () => {
    if (user && window.confirm('确定清除你的练习记录吗？无法恢复。')) {
      setHistory(clearUserHistory(user.uid));
      try {
        localStorage.removeItem(`k12_qdeck_v1_wordsmith_${user.uid}`);
      } catch {
        // Ignore storage errors
      }
    }
  };

  // --- Render ---

  if (authLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 font-extrabold text-slate-600" role="status">
        <Spinner /> 加载中…
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <BackLink href="#/s/english" />
        <div className="chunky bg-rose-100 mt-8 p-8 text-center">
          <div className="text-6xl" aria-hidden="true">✍️</div>
          <h1 className="text-3xl font-black mt-4">造句练习</h1>
          <p className="font-bold text-rose-800 mt-2">登录后开始</p>
        </div>
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="chunky bg-yellow-300 w-full mt-6 py-4 text-xl font-black flex items-center justify-center gap-3"
        >
          <LogIn className="w-6 h-6" aria-hidden="true" /> {isCnRegion() ? '登录同步开始造句' : '用 Google 登录'}
        </button>
      </>
    );
  }

  if (appState === 'custom-input') {
    return <CustomWordInput onSubmit={handleCustomWordsSubmit} onCancel={goToMenu} isLoading={isLoading} />;
  }

  if (appState === 'summary') {
    return (
      <BatchSummary
        results={batchResults}
        history={history}
        isCustomMode={isCustomMode}
        user={user}
        userName={userName}
        rewardOutcome={rewardOutcome}
        syncStatus={syncStatus}
        onRetrySync={() => {
          if (lastActivityInputRef.current) {
            void syncWordsmithBatch(lastActivityInputRef.current, lastRewardsRef.current ?? rewards);
          }
        }}
        onRestart={goToMenu}
      />
    );
  }

  const challenge = wordBatch[currentIndex];
  if (appState === 'playing' && challenge) {
    const total = wordBatch.length || DEFAULT_BATCH_SIZE;
    if (currentEvaluation) {
      return (
        <FeedbackScreen
          challenge={challenge}
          result={currentEvaluation}
          userSentence={currentSentence}
          index={currentIndex + 1}
          total={total}
          isLastWord={currentIndex === wordBatch.length - 1}
          isRetrying={isEvaluating}
          onRetry={handleRetryEvaluation}
          onNext={handleNext}
          onQuit={quitBatch}
        />
      );
    }
    return (
      <PlayScreen
        key={currentIndex}
        challenge={challenge}
        index={currentIndex + 1}
        total={total}
        isEvaluating={isEvaluating}
        onSubmit={handleSentenceSubmit}
        onQuit={quitBatch}
      />
    );
  }

  return (
    <StartScreen
      name={userName}
      history={history}
      onStartRandom={startRandomBatch}
      onStartCustom={() => setAppState('custom-input')}
      onClearHistory={handleClearHistory}
    />
  );
}
