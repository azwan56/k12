import React from 'react';
import { SUBJECTS, GradeLevel, gradeLabel } from '../data/k12Subjects';
import { THEME } from './ui';

export default function HomePage({ grade }: { grade: GradeLevel }) {
  return (
    <>
      <h1 className="text-4xl sm:text-5xl font-black leading-tight mt-4">
        今天学点什么？<span aria-hidden="true">👋</span>
      </h1>
      <p className="mt-2 text-lg font-bold text-slate-600">{gradeLabel(grade)} · 选一门课</p>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-8">
        {SUBJECTS.map((s, i) => (
          <li key={s.id} className={i === 0 ? 'sm:col-span-2' : ''}>
            <a
              href={`#/s/${s.id}`}
              className={`chunky ${THEME[s.id].soft} flex items-center gap-4 p-5 h-full`}
            >
              <span
                className={`${THEME[s.id].solid} w-16 h-16 shrink-0 rounded-2xl border-[3px] border-ink grid place-items-center text-3xl`}
                aria-hidden="true"
              >
                {s.emoji}
              </span>
              <span>
                <span className="block text-2xl font-black">{s.name}</span>
                <span className={`block font-bold ${THEME[s.id].text}`}>{s.short[grade]}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
