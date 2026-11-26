import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Phone,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cnApi, CnApiError } from '../lib/cnApi';
import { getApiBaseUrl, isMobileBrowser, isWeChatBrowser } from '../lib/region';

type LoginTab = 'phone' | 'wechat';
type PhoneMode = 'login' | 'register';

export default function CnLoginModal() {
  const { loginModalOpen, closeLoginModal, refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState<LoginTab>('phone');
  const [phoneMode, setPhoneMode] = useState<PhoneMode>('login');
  const [agreed, setAgreed] = useState(true);
  const [showPolicy, setShowPolicy] = useState(false);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [grade, setGrade] = useState<'G6' | 'G7'>('G6');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState('');

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
          ? '微信服务号尚未完成认证配置，请先使用手机号登录或注册。'
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
    setPhoneError('');

    cnApi
      .getHealth()
      .then((res) => {
        if (cancelled) return;
        setHealth({
          wechatConfigured: res.wechatConfigured,
          devAuthEnabled: res.devAuthEnabled,
        });
        if (!res.wechatConfigured) {
          setActiveTab('phone');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth({ wechatConfigured: false, devAuthEnabled: false });
          setActiveTab('phone');
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
  }, [loginModalOpen, closeLoginModal]);

  useEffect(() => {
    if (
      loginModalOpen &&
      activeTab === 'wechat' &&
      !inWeChat &&
      health?.wechatConfigured &&
      qrState.status === 'idle'
    ) {
      void loadQrCode();
    }
  }, [loginModalOpen, activeTab, inWeChat, health?.wechatConfigured, qrState.status, loadQrCode]);

  useEffect(() => {
    if (
      !loginModalOpen ||
      activeTab !== 'wechat' ||
      inWeChat ||
      qrState.status !== 'pending' ||
      !qrState.sceneId
    ) {
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
  }, [loginModalOpen, activeTab, inWeChat, qrState.status, qrState.sceneId, refreshSession, closeLoginModal]);

  if (!loginModalOpen) return null;

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setPhoneError('请先阅读并勾选同意用户协议与隐私保护声明');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '').slice(0, 11);
    if (!/^1[3-9]\d{9}$/.test(cleanPhone)) {
      setPhoneError('请输入合法的 11 位中国大陆手机号');
      return;
    }
    if (password.length < (phoneMode === 'register' ? 6 : 1)) {
      setPhoneError(phoneMode === 'register' ? '请设置至少 6 位登录密码' : '请输入登录密码');
      return;
    }

    setPhoneBusy(true);
    setPhoneError('');
    try {
      if (phoneMode === 'register') {
        await cnApi.phoneRegister({
          phone: cleanPhone,
          password,
          displayName: displayName.trim() || undefined,
          grade,
        });
      } else {
        await cnApi.phoneLogin({
          phone: cleanPhone,
          password,
        });
      }
      await refreshSession();
      closeLoginModal();
    } catch (err) {
      setPhoneError(
        err instanceof Error ? err.message : phoneMode === 'register' ? '注册失败，请重试' : '登录失败，请检查账号密码'
      );
    } finally {
      setPhoneBusy(false);
    }
  };

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
      aria-label="登录 Vanpower K12"
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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl border-[3px] border-ink bg-yellow-300 text-2xl mb-3">
            🎓
          </div>
          <h2 className="text-2xl font-black text-ink">登录 Vanpower K12</h2>
          <p className="text-xs sm:text-sm font-bold text-slate-600 mt-1">
            登录后同步云端错题本、能量币心愿与家长督学看板
          </p>
        </div>

        {/* Auth Method Tabs (show WeChat tab when Service Account is configured) */}
        {health?.wechatConfigured && (
          <div className="mt-4 grid grid-cols-2 gap-2 p-1 rounded-2xl border-[3px] border-ink bg-white">
            <button
              type="button"
              onClick={() => setActiveTab('phone')}
              className={`py-2 rounded-xl text-xs sm:text-sm font-black transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'phone' ? 'bg-yellow-300 text-ink border-2 border-ink' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Phone className="w-4 h-4" /> 手机号登录
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('wechat')}
              className={`py-2 rounded-xl text-xs sm:text-sm font-black transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'wechat' ? 'bg-emerald-300 text-ink border-2 border-ink' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <QrCode className="w-4 h-4" /> 微信登录
            </button>
          </div>
        )}

        {/* Consent Checkbox */}
        <label className="mt-4 flex items-start gap-2.5 p-3 rounded-2xl border-2 border-ink/20 bg-white text-xs font-bold text-slate-700 cursor-pointer">
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
            <p>1. 我们仅收集手机号（加密存储）/昵称与学习作答记录，用于同步学习进度与家长督学。</p>
            <p>2. 所有数据存储在国内合规云服务，不会向第三方出售或推送广告。</p>
            <p>3. 家长与孩子绑定需经双方确认，且可随时在控制台解除绑定。</p>
          </div>
        )}

        {activeTab === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="mt-4 rounded-2xl border-[3px] border-ink bg-white p-4 sm:p-5 space-y-3.5">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-amber-50 border-2 border-ink/15">
              <button
                type="button"
                onClick={() => {
                  setPhoneMode('login');
                  setPhoneError('');
                }}
                className={`py-1.5 rounded-lg text-xs sm:text-sm font-black transition-colors ${
                  phoneMode === 'login' ? 'bg-ink text-white' : 'text-slate-600 hover:text-ink'
                }`}
              >
                已有账号登录
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhoneMode('register');
                  setPhoneError('');
                }}
                className={`py-1.5 rounded-lg text-xs sm:text-sm font-black transition-colors ${
                  phoneMode === 'register' ? 'bg-ink text-white' : 'text-slate-600 hover:text-ink'
                }`}
              >
                新用户注册
              </button>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">手机号码</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={11}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="请输入 11 位手机号"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-ink bg-cream/60 font-bold text-sm outline-none focus:bg-white focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                {phoneMode === 'register' ? '设置登录密码（至少 6 位）' : '登录密码'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={phoneMode === 'register' ? 'new-password' : 'current-password'}
                  maxLength={64}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={phoneMode === 'register' ? '请设置 6~64 位密码' : '请输入密码'}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-ink bg-cream/60 font-bold text-sm outline-none focus:bg-white focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-ink"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {phoneMode === 'register' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">昵称（选填）</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input
                      type="text"
                      maxLength={32}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="如：小明 / 小明妈妈"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-ink bg-cream/60 font-bold text-xs outline-none focus:bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">默认年级</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['G6', 'G7'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGrade(g)}
                        className={`py-2 rounded-xl border-2 border-ink text-xs font-black transition-colors ${
                          grade === g ? 'bg-yellow-300 text-ink' : 'bg-white text-slate-600'
                        }`}
                      >
                        {g === 'G6' ? '6 年级' : '7 年级'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {phoneError && (
              <p role="alert" className="text-xs font-extrabold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {phoneError}
              </p>
            )}

            <button
              type="submit"
              disabled={phoneBusy || !agreed}
              className="chunky bg-yellow-300 hover:bg-yellow-400 w-full py-3 text-base font-black text-ink flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {phoneBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              {phoneMode === 'register' ? '注册并登录' : '立即登录'}
            </button>

            {health && !health.wechatConfigured && (
              <p className="text-[11px] font-bold text-slate-500 text-center pt-1">
                微信一键登录将在企业服务号认证完成后同步开放
              </p>
            )}
          </form>
        ) : inWeChat ? (
          <div className="mt-4 space-y-3">
            <button
              type="button"
              disabled={!agreed || health?.wechatConfigured === false}
              onClick={handleWeChatH5Login}
              className="chunky bg-emerald-400 hover:bg-emerald-500 w-full py-3.5 text-lg font-black text-ink flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>💚 微信一键授权登录</span>
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border-[3px] border-ink bg-white p-5 text-center">
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
