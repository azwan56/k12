import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Loader2, QrCode, RefreshCw, ShieldCheck, Smartphone, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cnApi, CnApiError } from '../lib/cnApi';
import { getApiBaseUrl, isMobileBrowser, isWeChatBrowser } from '../lib/region';

export default function CnLoginModal() {
  const { loginModalOpen, closeLoginModal, refreshSession } = useAuth();
  const [agreed, setAgreed] = useState(true);
  const [showPolicy, setShowPolicy] = useState(false);

  const [health, setHealth] = useState<{
    wechatConfigured: boolean;
    devAuthEnabled: boolean;
  } | null>(null);

  const [qrState, setQrState] = useState<{
    loading: boolean;
    sceneId: string | null;
    qrDataUrl: string | null;
    status: 'idle' | 'pending' | 'confirmed' | 'expired' | 'error';
    errorText: string;
  }>({
    loading: false,
    sceneId: null,
    qrDataUrl: null,
    status: 'idle',
    errorText: '',
  });

  const [devBusy, setDevBusy] = useState<'student' | 'parent' | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const inWeChat = isWeChatBrowser();
  const onMobileNonWeChat = !inWeChat && isMobileBrowser();

  const loadQrCode = useCallback(async () => {
    setQrState({
      loading: true,
      sceneId: null,
      qrDataUrl: null,
      status: 'pending',
      errorText: '',
    });
    try {
      const res = await cnApi.createWeChatQr();
      setQrState({
        loading: false,
        sceneId: res.sceneId,
        qrDataUrl: res.qrDataUrl,
        status: 'pending',
        errorText: '',
      });
    } catch (err) {
      const msg =
        err instanceof CnApiError && err.code === 'WECHAT_NOT_CONFIGURED'
          ? '微信服务号尚未配置，请在服务器设置 WECHAT_APP_ID 与 WECHAT_APP_SECRET（本地测试可使用下方测试账号）。'
          : err instanceof Error
            ? err.message
            : '生成微信登录二维码失败';
      setQrState({
        loading: false,
        sceneId: null,
        qrDataUrl: null,
        status: 'error',
        errorText: msg,
      });
    }
  }, []);

  useEffect(() => {
    if (!loginModalOpen) return;
    let cancelled = false;

    cnApi
      .getHealth()
      .then((res) => {
        if (cancelled) return;
        setHealth({
          wechatConfigured: res.wechatConfigured,
          devAuthEnabled: res.devAuthEnabled,
        });
        if (!inWeChat && res.wechatConfigured) {
          void loadQrCode();
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth({ wechatConfigured: false, devAuthEnabled: false });
        }
      });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLoginModal();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelled = true;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [loginModalOpen, inWeChat, loadQrCode, closeLoginModal]);

  useEffect(() => {
    if (!loginModalOpen || inWeChat || qrState.status !== 'pending' || !qrState.sceneId) {
      return;
    }
    const sceneId = qrState.sceneId;
    let cancelled = false;

    const timer = window.setInterval(() => {
      void cnApi
        .pollWeChatQrStatus(sceneId)
        .then(async (res) => {
          if (cancelled) return;
          if (res.status === 'confirmed') {
            setQrState((prev) => ({ ...prev, status: 'confirmed' }));
            await refreshSession();
            closeLoginModal();
          } else if (res.status === 'expired') {
            setQrState((prev) => ({ ...prev, status: 'expired' }));
          }
        })
        .catch(() => {
          // Ignore transient poll errors
        });
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loginModalOpen, inWeChat, qrState.status, qrState.sceneId, refreshSession, closeLoginModal]);

  if (!loginModalOpen) return null;

  const handleWeChatH5Login = () => {
    if (!agreed) return;
    const returnTo = window.location.hash || '#/';
    const authorizeUrl = `${getApiBaseUrl()}/api/auth/wechat/authorize?returnTo=${encodeURIComponent(returnTo)}`;
    window.location.href = authorizeUrl;
  };

  const handleDevLogin = async (role: 'student' | 'parent') => {
    if (!agreed) return;
    setDevBusy(role);
    try {
      await cnApi.devLogin(role);
      await refreshSession();
      closeLoginModal();
    } catch (err) {
      console.error('[CnLoginModal] devLogin failed:', err);
    } finally {
      setDevBusy(null);
    }
  };

  const handleCopyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="微信登录 Vanpower K12"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border-[3px] border-ink bg-cream shadow-[6px_6px_0_var(--color-ink)] p-6 relative max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={closeLoginModal}
          aria-label="关闭登录弹窗"
          className="absolute right-4 top-4 p-2 rounded-full border-2 border-ink bg-white hover:bg-yellow-100"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center pr-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl border-[3px] border-ink bg-emerald-300 text-2xl mb-3">
            💬
          </div>
          <h2 className="text-2xl font-black text-ink">微信登录 Vanpower K12</h2>
          <p className="text-xs sm:text-sm font-bold text-slate-600 mt-1">
            登录后同步云端错题本、能量币心愿与家长督学看板
          </p>
        </div>

        {/* Consent Checkbox */}
        <label className="mt-5 flex items-start gap-2.5 p-3 rounded-2xl border-2 border-ink/20 bg-white text-xs font-bold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-emerald-600 shrink-0"
          />
          <span>
            我已阅读并同意{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowPolicy((v) => !v);
              }}
              className="underline font-black text-ink"
            >
              《用户协议与未成年人隐私保护声明》
            </button>
            （未满 14 周岁需由监护人同意）
          </span>
        </label>

        {showPolicy && (
          <div className="mt-2 p-3 rounded-2xl border-2 border-ink/20 bg-amber-50 text-xs font-semibold text-slate-700 space-y-1 leading-relaxed">
            <p className="font-black text-ink flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-700" /> 隐私与安全说明
            </p>
            <p>1. 我们仅收集微信昵称、头像与学习作答记录，用于同步学习进度与家长督学。</p>
            <p>2. 所有数据存储在国内合规云服务，不会向第三方出售或推送广告。</p>
            <p>3. 家长与孩子绑定需经双方确认，且可随时在控制台解除绑定。</p>
          </div>
        )}

        {/* In-WeChat H5 One-Tap Login */}
        {inWeChat ? (
          <div className="mt-5 space-y-3">
            <button
              type="button"
              disabled={!agreed || health?.wechatConfigured === false}
              onClick={handleWeChatH5Login}
              className="chunky bg-emerald-400 hover:bg-emerald-500 w-full py-3.5 text-lg font-black text-ink flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>💚 微信一键授权登录</span>
            </button>
            {health?.wechatConfigured === false && (
              <p className="text-xs font-bold text-amber-800 text-center">
                微信服务号尚未配置完成，请联系管理员或使用测试账号。
              </p>
            )}
          </div>
        ) : (
          /* PC / iPad Service Account QR Login */
          <div className="mt-5 rounded-2xl border-[3px] border-ink bg-white p-5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-sm font-black text-ink mb-3">
              <QrCode className="w-4 h-4 text-emerald-700" />
              <span>打开微信「扫一扫」登录</span>
            </div>

            {qrState.loading && (
              <div className="py-10 flex flex-col items-center gap-2 text-slate-500 font-bold text-sm">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>正在生成微信安全二维码…</span>
              </div>
            )}

            {!qrState.loading && qrState.qrDataUrl && qrState.status === 'pending' && (
              <div className="flex flex-col items-center">
                <img
                  src={qrState.qrDataUrl}
                  alt="微信扫码登录二维码"
                  className="w-44 h-44 rounded-xl border-2 border-ink/20"
                />
                <p className="text-xs font-bold text-slate-500 mt-2">
                  扫码并关注/确认后，页面将自动登录跳转
                </p>
              </div>
            )}

            {!qrState.loading && qrState.status === 'expired' && (
              <div className="py-6 space-y-3">
                <p className="text-sm font-extrabold text-amber-800">二维码已过期</p>
                <button
                  type="button"
                  onClick={() => void loadQrCode()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-ink bg-yellow-300 font-black text-sm"
                >
                  <RefreshCw className="w-4 h-4" /> 刷新二维码
                </button>
              </div>
            )}

            {!qrState.loading && qrState.status === 'error' && (
              <div className="py-4 space-y-2">
                <p className="text-xs font-bold text-rose-700 leading-relaxed">{qrState.errorText}</p>
                <button
                  type="button"
                  onClick={() => void loadQrCode()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-ink bg-yellow-200 font-black text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> 重试
                </button>
              </div>
            )}

            {onMobileNonWeChat && (
              <div className="mt-4 pt-3 border-t-2 border-slate-100">
                <p className="text-xs font-bold text-slate-600 mb-2 flex items-center justify-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" /> 手机端推荐在微信中打开以一键登录
                </p>
                <button
                  type="button"
                  onClick={() => void handleCopyCurrentUrl()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border-2 border-ink bg-amber-100 hover:bg-amber-200 text-xs font-black"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl ? '已复制链接，去微信粘贴打开' : '复制当前链接到微信打开'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dev Sandbox Login (only rendered when ENABLE_DEV_AUTH=true on non-prod server) */}
        {health?.devAuthEnabled && (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-ink/40 bg-violet-50 p-3.5">
            <p className="text-xs font-black text-violet-900 mb-2">
              🧪 本地联调快捷登录（仅测试环境可见）
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!agreed || devBusy !== null}
                onClick={() => void handleDevLogin('student')}
                className="py-2 px-3 rounded-xl border-2 border-ink bg-white hover:bg-yellow-100 text-xs font-black disabled:opacity-50"
              >
                {devBusy === 'student' ? '登录中…' : '以「测试同学」登录'}
              </button>
              <button
                type="button"
                disabled={!agreed || devBusy !== null}
                onClick={() => void handleDevLogin('parent')}
                className="py-2 px-3 rounded-xl border-2 border-ink bg-white hover:bg-violet-100 text-xs font-black disabled:opacity-50"
              >
                {devBusy === 'parent' ? '登录中…' : '以「测试家长」登录'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
