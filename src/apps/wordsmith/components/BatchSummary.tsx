import { useRef } from 'react';
import type { AppUser } from '../../../lib/authTypes';
import { isCnRegion } from '../../../lib/region';
import { Star } from 'lucide-react';
import { BatchResult, SessionRecord } from '../types';
import ActivitySyncStatus, { type ActivitySyncState } from '../../../k12/ActivitySyncStatus';
import ReportActions from '../../../k12/ReportActions';
import type { ActivityRewardOutcome } from '../../../k12/rewards';
import RewardBanner from '../../../k12/RewardBanner';
import { BackButton, Stars } from './ui';

interface Props {
  results: BatchResult[];
  history: SessionRecord[];
  isCustomMode: boolean;
  user: AppUser;
  userName: string;
  rewardOutcome?: ActivityRewardOutcome | null;
  syncStatus?: ActivitySyncState;
  onRetrySync?: () => void;
  onRestart: () => void;
}

export default function BatchSummary({
  results,
  history,
  isCustomMode,
  user: _user,
  userName,
  rewardOutcome,
  syncStatus = 'idle',
  onRetrySync,
  onRestart,
}: Props) {
  const reportRef = useRef<HTMLDivElement>(null);

  const scoredResults = results.filter((r) => !r.evaluation.isFallback);
  const total = scoredResults.reduce((acc, r) => acc + r.evaluation.score, 0);
  const max = scoredResults.length * 5;
  // history already includes this session (saved before showing the summary)
  const allTimeWords = history.reduce((acc, s) => acc + s.results.length, 0);
  const allTimeStars = history.reduce(
    (acc, s) => acc + s.results.reduce((a, r) => a + r.evaluation.score, 0),
    0
  );

  const subjectLabel = isCustomMode ? 'WordSmith · 自定义词汇造句' : 'WordSmith · 随机词汇造句';
  const scoreSummary = max > 0 ? `${total}/${max} 星` : `${results.length} 词`;

  return (
    <>
      <BackButton onClick={onRestart} />

      {/* Captured for the report image */}
      <div ref={reportRef} className="mt-6 bg-white rounded-3xl border-[3px] border-ink p-6">
        <div className="text-center">
          <p className="font-extrabold text-rose-800">
            {isCustomMode ? '自定义词汇' : `${results.length} 个新词`} · {userName}
          </p>
          <h1 className="text-3xl font-black mt-1">练习完成！</h1>
          {max > 0 ? (
            <p className="text-5xl font-black mt-4 flex items-center justify-center gap-2 tabular-nums">
              <Star className="w-10 h-10 fill-yellow-300 text-ink" strokeWidth={2.5} aria-hidden="true" />
              {total}
              <span className="text-2xl text-slate-600">/ {max}</span>
            </p>
          ) : (
            <p className="text-xl font-black mt-4 text-amber-800">本次暂无有效评分</p>
          )}
          <p className="text-sm font-extrabold text-slate-600 mt-2">
            累计 {history.length} 组 · {allTimeWords} 个词 · {allTimeStars} 星
          </p>
        </div>

        <ul className="mt-6 space-y-3">
          {results.map((r, i) => (
            <li key={i} className="rounded-2xl bg-rose-100 p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-black text-lg">{r.wordChallenge.word}</span>
                {r.evaluation.isFallback ? (
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 border-2 border-ink text-amber-900">
                    未评分
                  </span>
                ) : (
                  <Stars score={r.evaluation.score} size="sm" />
                )}
              </div>
              <p className="font-bold mt-1 text-slate-700">"{r.userSentence}"</p>
              {r.evaluation.correction && (
                <p className="text-sm font-bold mt-1 text-amber-800">改：{r.evaluation.correction}</p>
              )}
            </li>
          ))}
        </ul>

        <p className="text-center text-xs font-extrabold text-slate-500 mt-5 tracking-widest">
          {isCnRegion() ? 'K12.VANPOWER.NET · WORDSMITH' : 'WORDSMITH.VANPOWER.LIVE'}
        </p>
      </div>

      <RewardBanner outcome={rewardOutcome ?? null} />

      <ActivitySyncStatus status={syncStatus} onRetry={onRetrySync} />

      <button
        type="button"
        onClick={onRestart}
        className="chunky bg-yellow-300 w-full mt-6 py-4 text-xl font-black"
      >
        {isCustomMode ? '完成' : '再来一组'}
      </button>

      <ReportActions
        reportRef={reportRef}
        subjectLabel={subjectLabel}
        scoreSummary={scoreSummary}
        filePrefix="WordSmith-Practice"
        sessionKey={history[0]?.id || 'ws'}
      />
    </>
  );
}
