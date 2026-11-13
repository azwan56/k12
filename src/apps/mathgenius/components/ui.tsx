import { ArrowLeft, Loader2 } from 'lucide-react';
import { DifficultyLevel } from '../types';

/** Same look as the portal BackLink, but as a button for in-app navigation. */
export function BackButton({ onClick, label = '返回' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 font-extrabold text-slate-600 hover:text-ink rounded-lg mt-2"
    >
      <ArrowLeft className="w-5 h-5" aria-hidden="true" />
      {label}
    </button>
  );
}

export const DIFF_EMOJI: Record<DifficultyLevel, string> = {
  foundation: '🌱',
  standard: '⚡',
  challenge: '🔥'
};

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center" role="status">
      <Loader2 className="w-12 h-12 text-sky-800 motion-safe:animate-spin" aria-hidden="true" />
      <p className="text-xl font-black mt-5">{label}</p>
    </div>
  );
}
