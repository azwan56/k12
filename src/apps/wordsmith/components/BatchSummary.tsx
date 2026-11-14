import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { toBlob } from 'html-to-image';
import { Check, Download, Send, Share2, Star, X } from 'lucide-react';
import { BatchResult, SessionRecord } from '../types';
import { resolveReportTarget, sendReport, type ReportTarget } from '../services/reportService';
import type { ActivityRewardOutcome } from '../../../k12/rewards';
import RewardBanner from '../../../k12/RewardBanner';
import { BackButton, Spinner, Stars } from './ui';

interface Props {
  results: BatchResult[];
  history: SessionRecord[];
  isCustomMode: boolean;
  user: User;
  userName: string;
  rewardOutcome?: ActivityRewardOutcome | null;
  onRestart: () => void;
}

type SendStatus = 'idle' | 'sending' | 'success' | 'error';

export default function BatchSummary({ results, history, isCustomMode, user, userName, rewardOutcome, onRestart }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<ReportTarget>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');

  const total = results.reduce((acc, r) => acc + r.evaluation.score, 0);
  const max = results.length * 5;
  // history already includes this session (saved before showing the summary)
  const allTimeWords = history.reduce((acc, s) => acc + s.results.length, 0);
  const allTimeStars = history.reduce(
    (acc, s) => acc + s.results.reduce((a, r) => a + r.evaluation.score, 0),
    0
  );

  const generateBlob = async (): Promise<Blob | null> => {
    if (!reportRef.current) return null;
    try {
      return await toBlob(reportRef.current, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
    } catch (e) {
      console.error('Error generating image:', e);
      return null;
    }
  };

  const download = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'WordSmith-Practice.png';
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const blob = await generateBlob();
      if (!blob) return;
      const file = new File([blob], 'WordSmith-Practice.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'WordSmith.VanPower Results',
            text: 'I just practiced my vocabulary list on WordSmith.VanPower!'
          });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') console.error('Share failed', err);
        }
      } else {
        download(blob);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    setIsSharing(true);
    const blob = await generateBlob();
    if (blob) download(blob);
    setIsSharing(false);
  };

  // Read-only lookup: only show "发给家长" when a webhook is resolvable. Never auto-send.
  useEffect(() => {
    let cancelled = false;
    resolveReportTarget(user, userName)
      .then((t) => {
        if (!cancelled) setTarget(t);
      })
      .catch((e) => {
        console.error('Report target lookup failed:', e);
        if (!cancelled) setTarget(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user.uid, userName]);

  const handleSend = async () => {
    if (!target) return;
    setSendStatus('sending');
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const blob = await generateBlob();
      if (!blob) throw new Error('Screenshot failed');
      setSendStatus((await sendReport(target, blob)) ? 'success' : 'error');
    } catch (e) {
      console.error('Report send failed:', e);
      setSendStatus('error');
    }
  };

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
          <p className="text-5xl font-black mt-4 flex items-center justify-center gap-2 tabular-nums">
            <Star className="w-10 h-10 fill-yellow-300 text-ink" strokeWidth={2.5} aria-hidden="true" />
            {total}
            <span className="text-2xl text-slate-600">/ {max}</span>
          </p>
          <p className="text-sm font-extrabold text-slate-600 mt-2">
            累计 {history.length} 组 · {allTimeWords} 个词 · {allTimeStars} 星
          </p>
        </div>

        <ul className="mt-6 space-y-3">
          {results.map((r, i) => (
            <li key={i} className="rounded-2xl bg-rose-100 p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-black text-lg">{r.wordChallenge.word}</span>
                <Stars score={r.evaluation.score} size="sm" />
              </div>
              <p className="font-bold mt-1 text-slate-700">"{r.userSentence}"</p>
              {r.evaluation.correction && (
                <p className="text-sm font-bold mt-1 text-amber-800">改：{r.evaluation.correction}</p>
              )}
            </li>
          ))}
        </ul>

        <p className="text-center text-xs font-extrabold text-slate-500 mt-5 tracking-widest">
          WORDSMITH.VANPOWER.LIVE
        </p>
      </div>

      <RewardBanner outcome={rewardOutcome ?? null} />

      {sendStatus !== 'idle' && (
        <p className="mt-4 flex items-center justify-center gap-2 font-extrabold" role="status">
          {sendStatus === 'sending' && (
            <>
              <Spinner className="w-4 h-4" /> 正在发送报告…
            </>
          )}
          {sendStatus === 'success' && (
            <>
              <Check className="w-5 h-5" strokeWidth={3} aria-hidden="true" /> 报告已发送
            </>
          )}
          {sendStatus === 'error' && (
            <>
              <X className="w-5 h-5" strokeWidth={3} aria-hidden="true" /> 发送失败
              <button type="button" onClick={handleSend} className="underline ml-1">
                重试
              </button>
            </>
          )}
        </p>
      )}

      <button
        type="button"
        onClick={onRestart}
        className="chunky bg-yellow-300 w-full mt-6 py-4 text-xl font-black"
      >
        {isCustomMode ? '完成' : '再来一组'}
      </button>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <button
          type="button"
          onClick={handleShare}
          disabled={isSharing}
          className="chunky bg-white py-3 font-black flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Share2 className="w-5 h-5" aria-hidden="true" /> 分享
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isSharing}
          className="chunky bg-white py-3 font-black flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Download className="w-5 h-5" aria-hidden="true" /> 保存图片
        </button>
      </div>

      {target && (
        <button
          type="button"
          onClick={handleSend}
          disabled={sendStatus === 'sending' || sendStatus === 'success'}
          className="chunky bg-white w-full mt-4 py-3 font-black flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="w-5 h-5" aria-hidden="true" /> 发给家长
        </button>
      )}
    </>
  );
}
