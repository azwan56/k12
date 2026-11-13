import { useEffect, useState } from 'react';
import type { GradeLevel, SubjectId } from '../data/k12Subjects';

/** Full class strings so Tailwind can see them at build time. */
export const THEME: Record<SubjectId, { soft: string; solid: string; text: string }> = {
  english: { soft: 'bg-rose-100', solid: 'bg-rose-300', text: 'text-rose-800' },
  'ig-math': { soft: 'bg-sky-100', solid: 'bg-sky-300', text: 'text-sky-800' },
  'shanghai-math': { soft: 'bg-emerald-100', solid: 'bg-emerald-300', text: 'text-emerald-800' },
  humanity: { soft: 'bg-amber-100', solid: 'bg-amber-300', text: 'text-amber-800' },
  science: { soft: 'bg-violet-100', solid: 'bg-violet-300', text: 'text-violet-800' }
};

export interface Route {
  path: string[];
  query: URLSearchParams;
}

const parseHash = (): Route => {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [pathPart, queryPart = ''] = raw.split('?');
  return {
    path: pathPart.split('/').filter(Boolean),
    query: new URLSearchParams(queryPart)
  };
};

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** Update the query without adding a history entry or scrolling. */
export function replaceQuery(path: string[], params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  history.replaceState(null, '', `#/${path.join('/')}${qs ? `?${qs}` : ''}`);
}

export function useGrade(): [GradeLevel, (g: GradeLevel) => void] {
  const [grade, setGradeState] = useState<GradeLevel>(() =>
    localStorage.getItem('k12_grade') === 'G7' ? 'G7' : 'G6'
  );
  const setGrade = (g: GradeLevel) => {
    localStorage.setItem('k12_grade', g);
    setGradeState(g);
  };
  return [grade, setGrade];
}
