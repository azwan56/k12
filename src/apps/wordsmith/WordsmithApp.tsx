import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import type { GradeLevel } from '../../data/k12Subjects';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useRewards } from '../../hooks/useRewards';
import type { ActivityRewardOutcome } from '../../k12/rewards';
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
  const { profile, resolvedName } = useProfile();
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
  const { recordWordsmith } = useRewards();

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
    setBatchResults([]);
    setCurrentIndex(0);
    setCurrentEvaluation(null);
    setCurrentSentence('');
  };

  const goToMenu = () => {
    setAppState('menu');
    setWordBatch([]);
    resetBatch();
    setIsCustomMode(false);
  };

  const quitBatch = () => {
    if (batchResults.length === 0 || window.confirm('退出本组？进度不会保存。')) goToMenu();
  };

  const startRandomBatch = async () => {
    setIsLoading(true);
    setIsCustomMode(false);
    resetBatch();
    try {
      const batch = await getWordBatch(DEFAULT_BATCH_SIZE);
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

  const handleSentenceSubmit = async (sentence: string) => {
    const currentWord = wordBatch[currentIndex];
    if (!currentWord) return;
    setIsEvaluating(true);
    setCurrentSentence(sentence);
    try {
      const result = await evaluateSentence(currentWord.word, sentence);
      setCurrentEvaluation(result);
      setBatchResults((prev) => [...prev, { wordChallenge: currentWord, userSentence: sentence, evaluation: result }]);
    } catch (error) {
      console.error('Failed to evaluate', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < wordBatch.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setCurrentEvaluation(null);
      setCurrentSentence('');
    } else {
      if (user) {
        const newSession: SessionRecord = {
          id: Date.now().toString(),
          userId: user.uid,
          timestamp: Date.now(),
          mode: isCustomMode ? 'custom' : 'random',
          results: batchResults
        };
        setHistory(saveSession(newSession));
      }
      const totalStars = batchResults.reduce((acc, r) => acc + r.evaluation.score, 0);
      setRewardOutcome(recordWordsmith(totalStars));
      setAppState('summary');
    }
  };

  const handleClearHistory = () => {
    if (user && window.confirm('确定清除你的练习记录吗？无法恢复。')) {
      setHistory(clearUserHistory(user.uid));
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
          <LogIn className="w-6 h-6" aria-hidden="true" /> 用 Google 登录
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
