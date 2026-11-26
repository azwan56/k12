import React from 'react';
import { AlertTriangle, Check, Loader2, LogIn, RefreshCw } from 'lucide-react';
import { isCnRegion } from '../lib/region';

export type ActivitySyncState = 'idle' | 'syncing' | 'synced' | 'guest' | 'error';

interface Props {
  status: ActivitySyncState;
  needsSSOSync?: boolean;
  onSignIn?: () => void;
  onRetry?: () => void;
}

export default function ActivitySyncStatus({
  status,
  needsSSOSync = false,
  onSignIn,
  onRetry,
}: Props) {
  if (status === 'idle') return null;

  if (status === 'syncing') {
    return (
      <div
        role="status"
        className="mt-4 rounded-2xl border-2 border-ink bg-sky-50 px-4 py-3 flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-sky-900"
      >
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        <span>⏳ 正在将本次练习同步至云端（家长督学看板）…</span>
      </div>
    );
  }

  if (status === 'synced') {
    return (
      <div
        role="status"
        className="mt-4 rounded-2xl border-2 border-emerald-700 bg-emerald-50 px-4 py-3 flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-emerald-900"
      >
        <Check className="w-4 h-4 shrink-0" strokeWidth={3} aria-hidden="true" />
        <span>✅ 本次成绩已实时同步至云端，家长督学看板随时可见（无需同时在线）</span>
      </div>
    );
  }

  if (status === 'guest') {
    return (
      <div
        role="alert"
        className="mt-4 rounded-2xl border-[3px] border-ink bg-amber-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs sm:text-sm font-extrabold text-amber-950 leading-relaxed">
            ⚠️ 当前未登录{isCnRegion() ? '' : ' Google 账号'}，成绩仅暂存本机、家长看板暂不可见
          </div>
        </div>
        {onSignIn && (
          <button
            type="button"
            onClick={onSignIn}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border-2 border-ink bg-yellow-300 hover:bg-yellow-400 text-xs sm:text-sm font-black"
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            {isCnRegion()
              ? '立即登录并同步'
              : needsSSOSync
                ? '同步 Google 登录并上传'
                : '立即 Google 登录并同步'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="mt-4 rounded-2xl border-[3px] border-ink bg-rose-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 text-rose-800 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-xs sm:text-sm font-extrabold text-rose-950 leading-relaxed">
          ⚠️ 网络波动暂未完成云端同步，成绩已暂存本机并会自动重试
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border-2 border-ink bg-white hover:bg-yellow-100 text-xs sm:text-sm font-black"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          立即重试同步
        </button>
      )}
    </div>
  );
}
