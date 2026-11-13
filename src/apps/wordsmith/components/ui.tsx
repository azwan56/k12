import React from 'react';
import { ArrowLeft, Star } from 'lucide-react';

/** Same look as the portal BackLink, but as a button for in-app screens. */
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

export function Stars({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-9 h-9' : size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${score} / 5 星`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          strokeWidth={2.5}
          className={`${cls} ${i <= score ? 'fill-yellow-300 text-ink' : 'text-slate-300'}`}
        />
      ))}
    </span>
  );
}

export const scoreLabel = (score: number): string =>
  score >= 5 ? '完美！' : score >= 4 ? '很棒！' : score >= 3 ? '不错！' : score >= 2 ? '再加油' : '再试试';

export function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${className} inline-block rounded-full border-[3px] border-ink border-t-transparent motion-safe:animate-spin`}
    />
  );
}

export type Children = { children?: React.ReactNode };
