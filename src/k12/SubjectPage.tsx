import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, Play } from 'lucide-react';
import { Subject, GradeLevel } from '../data/k12Subjects';
import { THEME, replaceQuery } from './ui';
import { useAuth } from '../hooks/useAuth';

interface Props {
  subject: Subject;
  grade: GradeLevel;
  initialTrack: string | null;
}

export function BackLink({ href, label = '返回' }: { href: string; label?: string }) {
  return (
    <a href={href} className="inline-flex items-center gap-1.5 font-extrabold text-slate-600 hover:text-ink rounded-lg mt-2">
      <ArrowLeft className="w-5 h-5" aria-hidden="true" />
      {label}
    </a>
  );
}

export default function SubjectPage({ subject, grade, initialTrack }: Props) {
  const theme = THEME[subject.id];
  const tracks = subject.tracks?.[grade] ?? [];
  const { generateCustomTokenAndRedirect } = useAuth();

  const pickTrack = (id: string | null) =>
    tracks.find((t) => t.id === id)?.id ?? tracks[0]?.id ?? null;
  const [trackId, setTrackId] = useState<string | null>(() => pickTrack(initialTrack));

  // Grade switch may change the available tracks.
  useEffect(() => {
    setTrackId((cur) => pickTrack(cur));
  }, [grade]);

  const selectTrack = (id: string) => {
    setTrackId(id);
    replaceQuery(['s', subject.id], { t: id });
  };

  const track = tracks.find((t) => t.id === trackId);
  const topics = track ? track.topics : subject.topics[grade];
  const practiceHref = `#/s/${subject.id}/practice${track ? `?t=${track.id}` : ''}`;

  return (
    <>
      <BackLink href="#/" />

      <div className="flex items-center gap-4 mt-6">
        <span
          className={`${theme.solid} w-20 h-20 shrink-0 rounded-3xl border-[3px] border-ink grid place-items-center text-4xl`}
          aria-hidden="true"
        >
          {subject.emoji}
        </span>
        <div>
          <h1 className="text-4xl font-black">{subject.name}</h1>
          <p className={`font-bold ${theme.text}`}>{subject.short[grade]}</p>
        </div>
      </div>

      {/* English: two main tools */}
      {subject.id === 'english' && (
        <div className="grid sm:grid-cols-2 gap-5 mt-8">
          <button
            type="button"
            onClick={() => generateCustomTokenAndRedirect('https://wordsmith.vanpower.live')}
            className="chunky bg-white p-6 text-left"
          >
            <span className="text-4xl" aria-hidden="true">✍️</span>
            <span className="flex items-center gap-2 text-2xl font-black mt-3">
              Wordsmith 造句 <ExternalLink className="w-5 h-5" aria-hidden="true" />
            </span>
          </button>
          <a href="#/s/english/essay" className="chunky bg-white p-6 block">
            <span className="text-4xl" aria-hidden="true">📝</span>
            <span className="flex items-center gap-2 text-2xl font-black mt-3">
              命题作文 <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </span>
          </a>
        </div>
      )}

      {/* IG Math: link to MathGenius */}
      {subject.id === 'ig-math' && (
        <button
          type="button"
          onClick={() => generateCustomTokenAndRedirect('https://mathgenius.vanpower.live')}
          className="chunky bg-white p-5 mt-8 w-full flex items-center gap-3 text-left"
        >
          <span className="text-3xl" aria-hidden="true">🚀</span>
          <span className="text-xl font-black flex-1">MathGenius 刷题</span>
          <ExternalLink className="w-5 h-5" aria-hidden="true" />
        </button>
      )}

      {/* Sub-tracks */}
      {tracks.length > 0 && (
        <div role="group" aria-label="选择分科" className="flex flex-wrap gap-3 mt-8">
          {tracks.map((t) => {
            const active = t.id === trackId;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => selectTrack(t.id)}
                className={`px-5 py-2.5 rounded-full border-[3px] border-ink font-extrabold text-lg transition-colors ${
                  active ? `${theme.solid} shadow-[3px_3px_0_var(--color-ink)]` : 'bg-white hover:bg-yellow-50'
                }`}
              >
                <span aria-hidden="true">{t.emoji}</span> {t.name} · {t.nameZh}
              </button>
            );
          })}
        </div>
      )}

      {/* Topics */}
      {topics.length > 0 && (
        <ul className="flex flex-wrap gap-2.5 mt-6" aria-label="本单元知识点">
          {topics.map((t) => (
            <li key={t} className={`${theme.soft} px-4 py-2 rounded-2xl font-bold`}>
              {t}
            </li>
          ))}
        </ul>
      )}

      <a
        href={practiceHref}
        className="chunky bg-yellow-300 mt-10 flex items-center justify-center gap-3 py-5 text-2xl font-black"
      >
        <Play className="w-7 h-7 fill-current" aria-hidden="true" />
        开始练习
      </a>
    </>
  );
}
