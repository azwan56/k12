import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Download, Loader2, Send, Share2, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { isCnRegion, isWeChatBrowser } from '../lib/region';
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
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const autoSentKeyRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    setSendStatus('idle');
  }, [sessionKey]);

  useEffect(() => {
    if (!user?.uid || isCnRegion()) {
      setTarget(null);
      return;
    }
    let cancelled = false;
    const fallbackName =
      resolvedName || user.displayName || user.email?.split('@')[0] || 'Student';
    resolvePortalReportTarget(user, fallbackName)
      .then((res) => {
        if (!cancelled) setTarget(res);
      })
      .catch((err) => {
        console.warn('[ReportActions] Target lookup failed:', err);
        if (!cancelled) setTarget(null);
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

  const openWeChatPreview = (blob: Blob) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  const handleShare = async () => {
    setIsCapturing(true);
    try {
      const blob = await captureReportPngBlob(reportRef.current, backgroundColor);
      if (!blob) return;
      if (isWeChatBrowser()) {
        openWeChatPreview(blob);
        return;
      }
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
      if (!blob) return;
      if (isWeChatBrowser()) {
        openWeChatPreview(blob);
        return;
      }
      downloadPngBlob(blob, safeFilename);
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

      {previewUrl && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="长按保存成绩单图片"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border-[3px] border-ink bg-white p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-ink">长按下方图片即可保存或转发给家长</p>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                aria-label="关闭图片预览"
                className="p-1.5 rounded-full border-2 border-ink bg-amber-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewUrl}
              alt={`${subjectLabel} 成绩单`}
              className="w-full max-h-[70vh] object-contain rounded-2xl border-2 border-ink/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}
