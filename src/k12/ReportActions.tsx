import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Download, Loader2, Send, Share2, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import {
  type PortalReportTarget,
  captureReportPngBlob,
  downloadPngBlob,
  resolvePortalReportTarget,
  sendPortalReportToDiscord,
  shareOrDownloadPngBlob,
} from './portalReportService';

export interface ReportActionsProps {
  reportRef: React.RefObject<HTMLDivElement | null>;
  subjectLabel: string;
  scoreSummary: string;
  filePrefix?: string;
  backgroundColor?: string;
  sessionKey: string;
  autoSend?: boolean;
  ready?: boolean;
}

type SendStatus = 'idle' | 'sending' | 'success' | 'error';

export default function ReportActions({
  reportRef,
  subjectLabel,
  scoreSummary,
  filePrefix = 'K12-Practice',
  backgroundColor = '#ffffff',
  sessionKey,
  autoSend = true,
  ready = true,
}: ReportActionsProps) {
  const { user } = useAuth();
  const { resolvedName } = useProfile();

  const [target, setTarget] = useState<PortalReportTarget | null>(null);
  const [targetLoading, setTargetLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [isCapturing, setIsCapturing] = useState(false);

  const autoSentKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setSendStatus('idle');
  }, [sessionKey]);

  useEffect(() => {
    if (!user?.uid) {
      setTarget(null);
      setTargetLoading(false);
      return;
    }
    let cancelled = false;
    setTargetLoading(true);
    const fallbackName =
      resolvedName || user.displayName || user.email?.split('@')[0] || 'Student';
    resolvePortalReportTarget(user, fallbackName)
      .then((res) => {
        if (!cancelled) setTarget(res);
      })
      .catch((err) => {
        console.warn('[ReportActions] Target lookup failed:', err);
        if (!cancelled) setTarget(null);
      })
      .finally(() => {
        if (!cancelled) setTargetLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, resolvedName]);

  const sendReportNow = useCallback(async () => {
    if (!target || !reportRef.current) return;
    setSendStatus('sending');
    try {
      const blob = await captureReportPngBlob(reportRef.current, backgroundColor);
      if (!blob) throw new Error('Report capture failed');
      const ok = await sendPortalReportToDiscord(target, blob, {
        subjectLabel,
        scoreSummary,
        filePrefix,
      });
      setSendStatus(ok ? 'success' : 'error');
    } catch (err) {
      console.error('[ReportActions] Report send failed:', err);
      setSendStatus('error');
    }
  }, [target, reportRef, backgroundColor, subjectLabel, scoreSummary, filePrefix]);

  // Automatically send once when webhook targets are available & card is ready
  useEffect(() => {
    if (!user || !target || !autoSend || !ready) return;
    if (autoSentKeyRef.current === sessionKey) return;
    autoSentKeyRef.current = sessionKey;

    const timer = window.setTimeout(() => {
      void sendReportNow();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [user, target, autoSend, ready, sessionKey, sendReportNow]);

  const safeFilename = `${filePrefix.replace(/[^A-Za-z0-9_-]/g, '-')}-${Date.now()}.png`;

  const handleShare = async () => {
    setIsCapturing(true);
    try {
      const blob = await captureReportPngBlob(reportRef.current, backgroundColor);
      if (!blob) return;
      await shareOrDownloadPngBlob(
        blob,
        safeFilename,
        `Vanpower K12 · ${subjectLabel}`,
        `我完成了「${subjectLabel}」练习（${scoreSummary}）！`
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownload = async () => {
    setIsCapturing(true);
    try {
      const blob = await captureReportPngBlob(reportRef.current, backgroundColor);
      if (blob) downloadPngBlob(blob, safeFilename);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="mt-5">
      {sendStatus !== 'idle' && (
        <p
          className={`mb-3 flex items-center justify-center gap-2 text-sm font-extrabold ${
            sendStatus === 'error'
              ? 'text-rose-700'
              : sendStatus === 'success'
                ? 'text-emerald-700'
                : 'text-slate-700'
          }`}
          role="status"
        >
          {sendStatus === 'sending' && (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              正在发送报告给家长…
            </>
          )}
          {sendStatus === 'success' && (
            <>
              <Check className="w-4 h-4" strokeWidth={3} aria-hidden="true" />
              报告已发送给家长
            </>
          )}
          {sendStatus === 'error' && (
            <>
              <X className="w-4 h-4" strokeWidth={3} aria-hidden="true" />
              发送失败
              <button
                type="button"
                onClick={() => void sendReportNow()}
                className="underline ml-1"
              >
                重试
              </button>
            </>
          )}
        </p>
      )}

      {sendStatus === 'idle' && user && !targetLoading && !target && (
        <p className="mb-3 text-center text-xs font-extrabold text-emerald-700" role="status">
          ✓ 练习结果已同步至「家长督学看板」，也可分享或保存成绩单图片
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={isCapturing}
          className="chunky bg-white py-3 font-black flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Share2 className="w-5 h-5" aria-hidden="true" />
          分享
        </button>
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={isCapturing}
          className="chunky bg-white py-3 font-black flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Download className="w-5 h-5" aria-hidden="true" />
          保存图片
        </button>
      </div>

      {user && target && (
        <button
          type="button"
          onClick={() => void sendReportNow()}
          disabled={sendStatus === 'sending' || sendStatus === 'success' || isCapturing}
          className="chunky bg-white w-full mt-4 py-3 font-black flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {sendStatus === 'sending' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              正在发送…
            </>
          ) : sendStatus === 'success' ? (
            <>
              <Check className="w-5 h-5 text-emerald-700" strokeWidth={3} aria-hidden="true" />
              已发给家长
            </>
          ) : (
            <>
              <Send className="w-5 h-5" aria-hidden="true" />
              发给家长
            </>
          )}
        </button>
      )}
    </div>
  );
}
