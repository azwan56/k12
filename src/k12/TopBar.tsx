import React, { useState } from 'react';
import { LogOut, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import ConsoleModal from '../components/ConsoleModal';
import type { GradeLevel } from '../data/k12Subjects';

interface TopBarProps {
  grade: GradeLevel;
  onGradeChange: (g: GradeLevel) => void;
}

export default function TopBar({ grade, onGradeChange }: TopBarProps) {
  const { user, needsSSOSync, signInWithGoogle, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="w-full max-w-3xl mx-auto px-5 py-5 flex items-center justify-between gap-3">
      <a href="#/" className="flex items-center gap-2 font-black text-lg rounded-xl">
        <span className="w-9 h-9 rounded-xl bg-yellow-300 border-[3px] border-ink grid place-items-center" aria-hidden="true">
          V
        </span>
        <span className="hidden sm:inline">VANPOWER K12</span>
      </a>

      <div className="flex items-center gap-2">
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
