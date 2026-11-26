import React, { useState } from 'react';
import { CheckCircle2, Link2, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { acceptGuardianInvite } from './guardianLinkService';
import { BackLink } from './SubjectPage';

export default function BindGuardianPage({ initialCode }: { initialCode?: string | null }) {
  const { user, loading, openLoginModal } = useAuth();
  const [code, setCode] = useState((initialCode || '').replace(/\D/g, '').slice(0, 6));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) {
      setStatus({ kind: 'err', text: '请输入家长提供的 6 位数字绑定码。' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const link = await acceptGuardianInvite(clean);
      setStatus({
        kind: 'ok',
        text: `已成功绑定家长「${link.parentName}」！今后你的练习成绩与错题回顾将自动同步到家长督学看板。`,
      });
    } catch (err) {
      setStatus({
        kind: 'err',
        text: err instanceof Error ? err.message : '绑定失败，请核对邀请码是否有效。',
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <>
        <BackLink href="#/" />
        <p className="text-xl font-black mt-10">正在验证登录状态…</p>
      </>
    );
  }

  return (
    <>
      <BackLink href="#/" />
      <div className="chunky bg-violet-100 p-6 sm:p-8 mt-6">
        <div className="text-5xl mb-3" aria-hidden="true">
          🔗
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-ink">绑定家长督学</h1>
        <p className="font-bold text-slate-700 mt-2">
          输入家长在「家长督学看板」生成的 6 位数字绑定码，授权家长查看你的各科练习与错题进展。
        </p>

        {!user ? (
          <div className="mt-6 rounded-2xl border-2 border-ink bg-white p-5 text-center">
            <p className="text-sm font-extrabold text-slate-700 mb-4">
              请先登录学生账号，再完成绑定确认
            </p>
            <button
              type="button"
              onClick={openLoginModal}
              className="chunky bg-yellow-300 px-6 py-3 inline-flex items-center gap-2 text-base font-black"
            >
              <LogIn className="w-5 h-5" /> 立即登录
            </button>
          </div>
        ) : status?.kind === 'ok' ? (
          <div className="mt-6 rounded-2xl border-[3px] border-emerald-700 bg-emerald-50 p-5 space-y-4">
            <div className="flex items-start gap-2.5 text-emerald-900 font-extrabold">
              <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" />
              <span>{status.text}</span>
            </div>
            <a
              href="#/"
              className="chunky bg-yellow-300 inline-flex items-center justify-center px-6 py-3 text-base font-black"
            >
              返回首页开始学习 →
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <label className="block text-sm font-black text-ink">6 位绑定码</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="例如 123456"
                className="flex-1 px-4 py-3 rounded-2xl border-[3px] border-ink bg-white text-xl font-black tracking-[0.25em] text-center outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="chunky bg-yellow-300 px-6 py-3 text-base font-black inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Link2 className="w-5 h-5" />
                {busy ? '绑定中…' : '确认绑定'}
              </button>
            </div>
            {status?.kind === 'err' && (
              <p className="text-sm font-extrabold text-rose-700">{status.text}</p>
            )}
          </form>
        )}
      </div>
    </>
  );
}
