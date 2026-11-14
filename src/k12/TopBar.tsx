import React, { useState } from 'react';
import { LogOut, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRewards } from '../hooks/useRewards';
import { TITLES, getActiveTitle, getUnlockedTitles } from './rewards';
import ConsoleModal from '../components/ConsoleModal';
import type { GradeLevel } from '../data/k12Subjects';

interface TopBarProps {
  grade: GradeLevel;
  onGradeChange: (g: GradeLevel) => void;
}

export default function TopBar({ grade, onGradeChange }: TopBarProps) {
  const { user, needsSSOSync, signInWithGoogle, logout } = useAuth();
  const { rewards, setActiveTitle } = useRewards();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [titleMenuOpen, setTitleMenuOpen] = useState(false);

  const activeTitle = getActiveTitle(rewards);
  const unlockedTitles = getUnlockedTitles(rewards.xp);

  return (
    <header className="w-full max-w-3xl mx-auto px-5 py-5 flex items-center justify-between gap-3">
      <a href="#/" className="flex items-center gap-2 font-black text-lg rounded-xl">
        <span className="w-9 h-9 rounded-xl bg-yellow-300 border-[3px] border-ink grid place-items-center" aria-hidden="true">
          V
        </span>
        <span className="hidden sm:inline">VANPOWER K12</span>
      </a>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setTitleMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border-[3px] border-ink bg-amber-100 text-xs sm:text-sm font-black hover:bg-amber-200 transition-colors"
            title={`头衔：${activeTitle.label}（${rewards.xp} XP）· 点击切换`}
          >
            <span aria-hidden="true">🪙</span>
            <span className="tabular-nums">{rewards.coins}</span>
            <span className="text-slate-400" aria-hidden="true">|</span>
            <span aria-hidden="true">🔥</span>
            <span className="tabular-nums">{rewards.streak.current}</span>
            <span className="hidden md:inline text-amber-900 ml-1">
              {activeTitle.emoji} {activeTitle.label}
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

        <div role="group" aria-label="选择年级" className="flex rounded-full border-[3px] border-ink bg-white p-1">
          {(['G6', 'G7'] as GradeLevel[]).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={grade === g}
              onClick={() => onGradeChange(g)}
              className={`px-3 sm:px-4 py-1 rounded-full text-sm font-extrabold transition-colors ${
                grade === g ? 'bg-ink text-white' : 'text-ink hover:bg-yellow-100'
              }`}
            >
              {g === 'G6' ? '6 年级' : '7 年级'}
            </button>
          ))}
        </div>

        {user ? (
          <>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-white"
              aria-label="家长设置"
              title="家长设置"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-full hover:bg-white"
              aria-label="退出登录"
              title="退出登录"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={signInWithGoogle}
            className="px-4 py-1.5 rounded-full border-[3px] border-ink bg-white text-sm font-extrabold hover:bg-yellow-100"
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
