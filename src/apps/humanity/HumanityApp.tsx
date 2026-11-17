import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Lock, Map, RefreshCw, Trophy, Unlock, X } from 'lucide-react';
import type { GradeLevel } from '../../data/k12Subjects';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useRewards } from '../../hooks/useRewards';
import { drawUnseenFromStorage, shuffleOptionsWithAnswer } from '../../k12/questionDedupe';
import ReportActions from '../../k12/ReportActions';
import type { ActivityRewardOutcome } from '../../k12/rewards';
import RewardBanner from '../../k12/RewardBanner';
import { BackLink } from '../../k12/SubjectPage';
import {
  type HumanityProgress,
  type QuestionReviewItem,
  loadLocalHumanityLevels,
  saveLocalHumanityLevels,
} from '../../k12/studentProgress';
import { recordStudentActivity } from '../../k12/studentProgressService';
import { type Question, SEASONS, type SeasonId } from './seasonData';

type ViewState = 'levels' | 'playing' | 'finished';

interface ReviewWithExplanation extends QuestionReviewItem {
  explanation?: string;
}

const QUESTIONS_PER_ROUND = 5;
const PASSING_SCORE = 5;
const TOTAL_LEVELS = 10;

export default function HumanityApp({ grade }: { grade: GradeLevel }) {
  const { user } = useAuth();
  const { profile, resolvedName, effectiveAvatarId } = useProfile();
  const { recordPractice } = useRewards();

  const [view, setView] = useState<ViewState>('levels');
  const [seasonId, setSeasonId] = useState<SeasonId>(1);
  const [unlockedMap, setUnlockedMap] = useState<HumanityProgress>(() =>
    loadLocalHumanityLevels(user?.uid)
  );
  const [playingLevel, setPlayingLevel] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [rewardOutcome, setRewardOutcome] = useState<ActivityRewardOutcome | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewWithExplanation[]>([]);
  const [runSeq, setRunSeq] = useState(0);
  const [lastDurationSec, setLastDurationSec] = useState<number | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const reportRef = useRef<HTMLDivElement>(null);

  const currentSeason = useMemo(
    () => SEASONS.find((s) => s.id === seasonId) ?? SEASONS[0],
    [seasonId]
  );

  const unlockedLevel =
    seasonId === 1 ? unlockedMap.s1 : seasonId === 2 ? unlockedMap.s2 : unlockedMap.s3;

  const startLevel = (level: number) => {
    const pool = currentSeason.data[level - 1] || currentSeason.data[0];
    const scope = `humanity_${user?.uid || 'guest'}_s${seasonId}_l${level}`;
    const { selected } = drawUnseenFromStorage(scope, pool, (q) => q.question, QUESTIONS_PER_ROUND);
    const drawn = selected.map((q) => {
      const shuffled = shuffleOptionsWithAnswer(q.options, q.answer);
      return { ...q, options: shuffled.options, answer: shuffled.answer };
    });
    setQuestions(drawn);
    setPlayingLevel(level);
    setQuestionIndex(0);
    setScore(0);
    setSelectedOption(null);
    setRewardOutcome(null);
    setReviewItems([]);
    setLastDurationSec(null);
    setRunSeq((n) => n + 1);
    startedAtRef.current = Date.now();
    setView('playing');
  };

  const currentQuestion = questions[questionIndex];

  const handleOptionClick = (optIdx: number) => {
    if (selectedOption !== null || !currentQuestion) return;
    setSelectedOption(optIdx);
    const isCorrect = optIdx === currentQuestion.answer;
    if (isCorrect) {
      setScore((s) => s + 1);
    }
    setReviewItems((prev) => [
      ...prev,
      {
        question: currentQuestion.question,
        userAnswer: currentQuestion.options[optIdx] ?? '',
        correctAnswer: currentQuestion.options[currentQuestion.answer] ?? '',
        isCorrect,
        category: currentSeason.levels[playingLevel - 1] || currentSeason.title,
        explanation: currentQuestion.explanation,
      },
    ]);
  };

  const handleNext = () => {
    if (questionIndex < QUESTIONS_PER_ROUND - 1) {
      setQuestionIndex((i) => i + 1);
      setSelectedOption(null);
      return;
    }

    const outcome = recordPractice(score, QUESTIONS_PER_ROUND);
    setRewardOutcome(outcome);
    const durationSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    setLastDurationSec(durationSec);

    if (score >= PASSING_SCORE && playingLevel === unlockedLevel && unlockedLevel < TOTAL_LEVELS) {
      const nextLevel = unlockedLevel + 1;
      const nextMap: HumanityProgress = {
        ...unlockedMap,
        ...(seasonId === 1 ? { s1: nextLevel } : seasonId === 2 ? { s2: nextLevel } : { s3: nextLevel }),
      };
      setUnlockedMap(nextMap);
      saveLocalHumanityLevels(nextMap, user?.uid);
    }

    if (user) {
      const levelTitle = currentSeason.levels[playingLevel - 1] || `第 ${playingLevel} 关`;
      const cleanedReview: QuestionReviewItem[] = reviewItems.map(
        ({ explanation: _explanation, ...rest }) => rest
      );
      void recordStudentActivity(
        user,
        { profile, resolvedName, effectiveAvatarId, rewards: outcome.nextState },
        {
          type: 'humanity',
          subjectId: 'humanity',
          title: `人文大闯关 · 第${seasonId}季 第${playingLevel}关 ${levelTitle}`,
          grade,
          score,
          maxScore: QUESTIONS_PER_ROUND,
          accuracyPct: Math.round((score / QUESTIONS_PER_ROUND) * 100),
          durationSec,
          summary: `${currentSeason.title} 第${playingLevel}关，答对 ${score}/${QUESTIONS_PER_ROUND} 题${score >= PASSING_SCORE ? '（通关）' : ''}`,
          questionItems: cleanedReview,
        }
      ).catch((err) => {
        console.warn('[HumanityApp] Failed to record activity:', err);
      });
    }

    setView('finished');
  };

  if (view === 'playing' && currentQuestion) {
    const answered = selectedOption !== null;
    const isCorrect = selectedOption === currentQuestion.answer;
    return (
      <>
        <div className="flex items-center justify-between">
          <BackLink href="#/s/humanity" />
          <span className="font-extrabold text-slate-600 mt-2">
            第 {seasonId} 季 · 第 {playingLevel} 关（{questionIndex + 1}/{QUESTIONS_PER_ROUND}）
          </span>
        </div>

        <div className="flex gap-2 mt-4" aria-hidden="true">
          {questions.map((_, i) => (
            <span
              key={i}
              className={`h-3 flex-1 rounded-full border-2 border-ink ${
                i < questionIndex
                  ? 'bg-amber-300'
                  : i === questionIndex
                    ? 'bg-yellow-300'
                    : 'bg-white'
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full border-2 border-ink bg-amber-100 text-xs font-black text-amber-900">
            {currentSeason.levels[playingLevel - 1] || `第 ${playingLevel} 关`}
          </span>
          <span className="font-black text-amber-900">当前得分：{score}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black leading-snug mt-4">
          {currentQuestion.question}
        </h1>

        <div className="grid gap-3 mt-6">
          {currentQuestion.options.map((option, idx) => {
            const isAnswer = idx === currentQuestion.answer;
            const isChosen = idx === selectedOption;
            let style = 'bg-white';
            if (answered && isAnswer) style = 'bg-emerald-200';
            else if (answered && isChosen) style = 'bg-rose-200';

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleOptionClick(idx)}
                disabled={answered}
                className={`chunky ${style} px-5 py-4 text-left text-lg font-bold flex items-center gap-3 disabled:cursor-default`}
              >
                <span className="w-8 h-8 shrink-0 rounded-full border-[3px] border-ink grid place-items-center font-black text-sm bg-white">
                  {answered && isAnswer ? (
                    <Check className="w-4 h-4" aria-label="正确答案" />
                  ) : answered && isChosen ? (
                    <X className="w-4 h-4" aria-label="你的选择" />
                  ) : (
                    String.fromCharCode(65 + idx)
                  )}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        <div aria-live="polite">
          {answered && (
            <div className="mt-6">
              <p className="text-2xl font-black">
                {isCorrect
                  ? '回答正确！🎉'
                  : `差一点～ 正确答案是 ${String.fromCharCode(65 + currentQuestion.answer)}`}
              </p>
              <p className="text-lg font-semibold text-slate-700 mt-1">
                {currentQuestion.explanation}
              </p>
              <button
                type="button"
                onClick={handleNext}
                className="chunky bg-yellow-300 w-full mt-5 py-4 text-xl font-black flex items-center justify-center gap-2"
              >
                {questionIndex < QUESTIONS_PER_ROUND - 1 ? '下一题' : '查看过关结算'}
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  if (view === 'finished') {
    const passed = score >= PASSING_SCORE;
    const accuracyPct = Math.round((score / QUESTIONS_PER_ROUND) * 100);
    const levelTitle = currentSeason.levels[playingLevel - 1] || `第 ${playingLevel} 关`;
    const studentName = resolvedName || user?.displayName || '同学';
    return (
      <>
        <BackLink href="#/s/humanity" />

        {/* Screenshot-ready Report Card */}
        <div ref={reportRef} className="mt-6 bg-white rounded-3xl border-[3px] border-ink p-6">
          <div className="text-center">
            <p className="font-extrabold text-amber-800">
              {currentSeason.title} · 第 {playingLevel} 关《{levelTitle}》 · {studentName}
            </p>
            <div className="mt-2 inline-grid place-items-center" aria-hidden="true">
              {passed ? <Trophy className="w-12 h-12 text-amber-500" /> : <span className="text-4xl">💪</span>}
            </div>
            <h1 className="text-3xl font-black mt-2">
              {passed ? `恭喜通过第 ${playingLevel} 关！` : `第 ${playingLevel} 关差一点通关`}
            </h1>
            <p className="text-5xl font-black mt-3 tabular-nums">
              {score}
              <span className="text-2xl text-slate-600"> / {QUESTIONS_PER_ROUND}</span>
            </p>
            <p className="text-sm font-extrabold text-slate-600 mt-2">
              正确率 {accuracyPct}%
              {lastDurationSec !== null && ` · 用时 ${lastDurationSec} 秒`}
              {' · '}
              {passed ? '全对通关！已解锁下一关' : '需全对解锁下一关'}
            </p>
          </div>

          <ul className="mt-6 space-y-2.5">
            {reviewItems.map((item, i) => (
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
                    <p className="font-bold text-sm text-ink">{i + 1}. {item.question}</p>
                    <p className="text-xs font-bold text-slate-700 mt-1">
                      你的作答：{item.userAnswer}
                      {!item.isCorrect && (
                        <span className="ml-2 text-emerald-800 font-black">
                          正确答案：{item.correctAnswer}
                        </span>
                      )}
                    </p>
                    {item.explanation && (
                      <p className="text-xs font-semibold text-slate-600 mt-1">{item.explanation}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-center text-xs font-extrabold text-slate-500 mt-5 tracking-widest">
            K12.VANPOWER.LIVE
          </p>
        </div>

        <RewardBanner outcome={rewardOutcome} />

        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <button
            type="button"
            onClick={() => setView('levels')}
            className="chunky bg-white py-4 text-xl font-black flex items-center justify-center gap-2"
          >
            <Map className="w-5 h-5" aria-hidden="true" /> 返回选关
          </button>
          {passed && playingLevel < TOTAL_LEVELS ? (
            <button
              type="button"
              onClick={() => startLevel(playingLevel + 1)}
              className="chunky bg-yellow-300 py-4 text-xl font-black flex items-center justify-center gap-2"
            >
              下一关挑战 <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startLevel(playingLevel)}
              className="chunky bg-yellow-300 py-4 text-xl font-black flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" aria-hidden="true" /> 再次挑战本关
            </button>
          )}
        </div>

        <ReportActions
          reportRef={reportRef}
          subjectLabel={`人文大闯关 · 第${seasonId}季 第${playingLevel}关 ${levelTitle}`}
          scoreSummary={`${score}/${QUESTIONS_PER_ROUND} 题（${accuracyPct}%）`}
          filePrefix="K12-Humanity"
          sessionKey={`humanity-s${seasonId}-l${playingLevel}-${runSeq}`}
        />
      </>
    );
  }

  return (
    <>
      <BackLink href="#/s/humanity" />

      <div className="chunky bg-amber-100 p-6 mt-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden="true">🏛️</span>
          <div>
            <h1 className="text-3xl font-black">中华历史地理大闯关</h1>
            <p className="font-bold text-amber-900 mt-1">{currentSeason.subtitle}</p>
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="选择季数" className="flex flex-wrap gap-2.5 mt-6">
        {SEASONS.map((s) => {
          const active = s.id === seasonId;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSeasonId(s.id)}
              className={`px-4 py-2 rounded-full border-[3px] border-ink font-extrabold text-sm sm:text-base transition-colors ${
                active
                  ? 'bg-amber-300 shadow-[3px_3px_0_var(--color-ink)]'
                  : 'bg-white hover:bg-yellow-50'
              }`}
            >
              {s.title}
            </button>
          );
        })}
      </div>

      <p className="text-sm font-bold text-slate-600 mt-4">
        共 3 季 30 关（300 道精选历史地理题目），每关随机抽 5 题，全对即可解锁下一关！
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
        {Array.from({ length: TOTAL_LEVELS }).map((_, idx) => {
          const level = idx + 1;
          const isUnlocked = level <= unlockedLevel;
          const levelName = currentSeason.levels[idx] || `第 ${level} 关`;
          return (
            <button
              key={level}
              type="button"
              disabled={!isUnlocked}
              onClick={() => startLevel(level)}
              className={`chunky p-3 text-left flex flex-col justify-between min-h-[108px] ${
                isUnlocked
                  ? 'bg-white hover:bg-amber-50'
                  : 'bg-slate-100 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-ink">
                  {String(level).padStart(2, '0')}
                </span>
                {isUnlocked ? (
                  <Unlock className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-400" aria-hidden="true" />
                )}
              </div>
              <div>
                <div className="text-xs font-black text-ink leading-snug mt-2">
                  {levelName}
                </div>
                <div className="text-[11px] font-bold text-slate-500 mt-1">
                  {isUnlocked ? '点击闯关' : '需前关全对'}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
