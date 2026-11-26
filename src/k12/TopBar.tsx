import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Check, ChevronDown, LogIn, LogOut, Pencil, Settings, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRewards } from '../hooks/useRewards';
import { useProfile } from '../hooks/useProfile';
import { formatAccountDisplay, isCnRegion } from '../lib/region';
import { TITLES, getActiveTitle, getUnlockedTitles } from './rewards';
import { AVATAR_OPTIONS, MAX_DISPLAY_NAME_LENGTH } from './profile';
import UserAvatar from './UserAvatar';
import ConsoleModal from '../components/ConsoleModal';
import type { GradeLevel } from '../data/k12Subjects';

interface TopBarProps {
  grade: GradeLevel;
  onGradeChange: (g: GradeLevel) => void;
}

export default function TopBar({ grade, onGradeChange }: TopBarProps) {
  const { user, needsSSOSync, signInWithGoogle, logout } = useAuth();
  const { rewards, setActiveTitle } = useRewards();
  const { profile, resolvedName, effectiveAvatarId, isSyncing, updateProfile } = useProfile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [titleMenuOpen, setTitleMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!titleMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setTitleMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTitleMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [titleMenuOpen]);

  useEffect(() => {
    if (!profileMenuOpen) {
      setIsEditingName(false);
      return;
    }
    const onPointerDown = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditingName) {
          setIsEditingName(false);
        } else {
          setProfileMenuOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [profileMenuOpen, isEditingName]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    void updateProfile({ displayName: draftName });
    setIsEditingName(false);
  };

  const activeTitle = getActiveTitle(rewards);
  const unlockedTitles = getUnlockedTitles(rewards.xp);

  return (
    <header className="w-full max-w-3xl mx-auto px-3 sm:px-5 py-4 sm:py-5 flex items-center justify-between gap-2 sm:gap-3">
      <a href="#/" className="flex items-center gap-2 font-black text-lg rounded-xl shrink-0">
        <span className="w-9 h-9 rounded-xl bg-yellow-300 border-[3px] border-ink grid place-items-center" aria-hidden="true">
          V
        </span>
        <span className="hidden sm:inline">VANPOWER K12</span>
      </a>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-expanded={titleMenuOpen}
            aria-haspopup="menu"
            onClick={() => setTitleMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[3px] border-ink bg-amber-100 text-xs sm:text-sm font-black hover:bg-amber-200 transition-colors whitespace-nowrap shrink-0"
            title={`头衔：${activeTitle.label}（${rewards.xp} XP）· 点击切换`}
          >
            <span aria-hidden="true">🪙</span>
            <span className="tabular-nums">{rewards.coins}</span>
            <span className="text-slate-400" aria-hidden="true">|</span>
            <span aria-hidden="true">🔥</span>
            <span className="tabular-nums">{rewards.streak.current}</span>
            <span className="hidden sm:inline text-slate-400" aria-hidden="true">|</span>
            <span className="hidden sm:inline" aria-hidden="true">
              {activeTitle.emoji}
            </span>
          </button>

          {titleMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-2xl border-[3px] border-ink bg-white shadow-[5px_5px_0_var(--color-ink)] p-3 z-50">
              <p className="text-xs font-black text-slate-500 mb-2">
                成长头衔（当前 {rewards.xp} XP）
              </p>
              <ul className="space-y-1">
                {TITLES.map((t) => {
                  const unlocked = unlockedTitles.some((u) => u.id === t.id);
                  const selected = activeTitle.id === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={!unlocked}
                        onClick={() => {
                          setActiveTitle(t.id);
                          setTitleMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-sm font-bold ${
                          selected
                            ? 'bg-yellow-200 border-2 border-ink'
                            : unlocked
                            ? 'hover:bg-slate-100'
                            : 'opacity-45 cursor-not-allowed'
                        }`}
                      >
                        <span>
                          {t.emoji} {t.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {unlocked ? (selected ? '使用中' : '可用') : `${t.minXp} XP`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div role="group" aria-label="选择年级" className="flex rounded-full border-[3px] border-ink bg-white p-0.5 sm:p-1 shrink-0">
          {(['G6', 'G7'] as GradeLevel[]).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={grade === g}
              onClick={() => onGradeChange(g)}
              className={`px-2.5 sm:px-3.5 py-1 rounded-full text-xs sm:text-sm font-extrabold transition-colors whitespace-nowrap ${
                grade === g ? 'bg-ink text-white' : 'text-ink hover:bg-yellow-100'
              }`}
            >
              {g === 'G6' ? '6 年级' : '7 年级'}
            </button>
          ))}
        </div>

        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            aria-expanded={profileMenuOpen}
            aria-haspopup="dialog"
            aria-label={`个人资料：${resolvedName}`}
            title={`${resolvedName} · 点击维护资料`}
            onClick={() => {
              setTitleMenuOpen(false);
              setProfileMenuOpen((o) => !o);
            }}
            className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full border-[3px] border-ink bg-white hover:bg-yellow-100 transition-colors shrink-0"
          >
            <UserAvatar
              avatarId={effectiveAvatarId}
              photoURL={user?.photoURL}
              displayName={resolvedName}
              size="sm"
            />
            <span className="hidden md:inline max-w-[120px] truncate text-sm font-extrabold text-ink">
              {resolvedName}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-ink/70 transition-transform ${
                profileMenuOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {profileMenuOpen && (
            <div
              role="dialog"
              aria-label="门户个人资料"
              className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 rounded-2xl border-[3px] border-ink bg-white shadow-[5px_5px_0_var(--color-ink)] p-4 z-50"
            >
              <div className="flex items-start gap-3">
                <UserAvatar
                  avatarId={effectiveAvatarId}
                  photoURL={user?.photoURL}
                  displayName={resolvedName}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  {isEditingName ? (
                    <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        type="text"
                        value={draftName}
                        maxLength={MAX_DISPLAY_NAME_LENGTH}
                        onChange={(e) => setDraftName(e.target.value)}
                        placeholder="输入昵称…"
                        aria-label="学生昵称"
                        className="w-full min-w-0 px-2.5 py-1 rounded-xl border-2 border-ink text-sm font-bold bg-cream focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <button
                        type="submit"
                        className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 shrink-0"
                        aria-label="保存昵称"
                        title="保存"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 shrink-0"
                        aria-label="取消编辑"
                        title="取消"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-base text-ink truncate">
                        {resolvedName}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftName(profile.displayName || resolvedName);
                          setIsEditingName(true);
                        }}
                        className="p-1 rounded-lg text-slate-500 hover:text-ink hover:bg-amber-100 transition-colors shrink-0"
                        aria-label="编辑昵称"
                        title="编辑昵称"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                    {user ? formatAccountDisplay(user.email, user.provider) : '本地访客档案 · 登录后自动云同步'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-yellow-100 border border-ink/20 text-ink">
                      {grade === 'G6' ? '6 年级' : '7 年级'}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 border border-ink/20 text-amber-900">
                      {activeTitle.emoji} {activeTitle.label}
                    </span>
                    {isSyncing && (
                      <span className="text-[11px] font-bold text-slate-400">同步中…</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-slate-100 pt-3 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-600">切换头像</span>
                  <span className="text-[11px] font-semibold text-slate-400">门户与控制台同步</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {user?.photoURL && (
                    <button
                      type="button"
                      onClick={() => void updateProfile({ avatarId: 'google' })}
                      aria-pressed={effectiveAvatarId === 'google'}
                      aria-label={isCnRegion() ? '使用微信头像' : '使用 Google 头像'}
                      title={isCnRegion() ? '微信账号头像' : 'Google 账号头像'}
                      className={`p-0.5 rounded-full transition-transform ${
                        effectiveAvatarId === 'google'
                          ? 'ring-2 ring-ink ring-offset-2 scale-105'
                          : 'opacity-75 hover:opacity-100'
                      }`}
                    >
                      <UserAvatar
                        avatarId="google"
                        photoURL={user.photoURL}
                        displayName={resolvedName}
                        size="sm"
                      />
                    </button>
                  )}
                  {AVATAR_OPTIONS.map((opt) => {
                    const selected = effectiveAvatarId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => void updateProfile({ avatarId: opt.id })}
                        aria-pressed={selected}
                        aria-label={opt.label}
                        title={opt.label}
                        className={`p-0.5 rounded-full transition-transform ${
                          selected
                            ? 'ring-2 ring-ink ring-offset-2 scale-105'
                            : 'opacity-75 hover:opacity-100'
                        }`}
                      >
                        <UserAvatar avatarId={opt.id} size="sm" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl bg-amber-50 border-2 border-ink/15 p-2.5 mt-3 text-center">
                <div>
                  <div className="text-[11px] font-bold text-slate-500">金币</div>
                  <div className="text-sm font-black tabular-nums text-ink">🪙 {rewards.coins}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500">经验值</div>
                  <div className="text-sm font-black tabular-nums text-ink">⚡ {rewards.xp}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500">连胜</div>
                  <div className="text-sm font-black tabular-nums text-ink">🔥 {rewards.streak.current} 天</div>
                </div>
              </div>

              <div className="border-t-2 border-slate-100 pt-3 mt-3 flex flex-col gap-2">
                {user ? (
                  <>
                    <a
                      href="#/parent"
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-ink bg-violet-200 hover:bg-violet-300 text-sm font-extrabold text-ink transition-colors"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>👨‍👩‍👧 家长督学看板</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setSettingsOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-ink bg-yellow-200 hover:bg-yellow-300 text-sm font-extrabold text-ink transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>门户资料与家长控制台</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        void logout();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-extrabold transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>退出登录</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      void signInWithGoogle();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-ink bg-ink text-white hover:bg-slate-800 text-sm font-extrabold transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>
                      {isCnRegion()
                        ? '使用微信登录同步'
                        : needsSSOSync
                          ? '同步 Google 登录'
                          : '使用 Google 登录同步'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {user ? (
          <>
            <a
              href="#/parent"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border-2 border-ink bg-violet-200 hover:bg-violet-300 text-xs font-black text-ink shrink-0 whitespace-nowrap"
              aria-label="家长督学看板"
              title="家长督学看板"
            >
              <span aria-hidden="true">👨‍👩‍👧</span>
              <span className="hidden sm:inline">督学</span>
            </a>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-white shrink-0"
              aria-label="家长设置"
              title="家长设置"
            >
              <Settings className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={signInWithGoogle}
            className="px-3 sm:px-4 py-1.5 rounded-full border-[3px] border-ink bg-white text-xs sm:text-sm font-extrabold hover:bg-yellow-100 shrink-0 whitespace-nowrap"
          >
            {needsSSOSync ? '同步登录' : '登录'}
          </button>
        )}
      </div>

      {user && (
        <ConsoleModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} isDarkMode={false} />
      )}
    </header>
  );
}
