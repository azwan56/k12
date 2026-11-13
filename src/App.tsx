import React, { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { getSubject } from './data/k12Subjects';
import { useGrade, useHashRoute } from './k12/ui';
import TopBar from './k12/TopBar';
import HomePage from './k12/HomePage';
import SubjectPage from './k12/SubjectPage';
import PracticePage from './k12/PracticePage';
import EssayPage from './k12/EssayPage';

export default function App() {
  const { user, loading, generateCustomTokenAndRedirect } = useAuth();
  const route = useHashRoute();
  const [grade, setGrade] = useGrade();

  // Cross-domain SSO bounce: other *.vanpower.live apps send users here to mint a token.
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect');
    if (params.get('sso_bounce') !== 'true' || !redirectUrl) return;

    if (user) {
      generateCustomTokenAndRedirect(redirectUrl).catch((e) => {
        console.error('SSO Bounce Custom Token generation failed', e);
        window.location.href = redirectUrl;
      });
    } else {
      const separator = redirectUrl.includes('?') ? '&' : '?';
      window.location.href = `${redirectUrl}${separator}sso_failed=true`;
    }
  }, [loading, user, generateCustomTokenAndRedirect]);

  const [section, subjectId, view] = route.path;
  const subject = section === 's' ? getSubject(subjectId) : undefined;
  const track = route.query.get('t');

  let page: React.ReactNode;
  if (subject && view === 'practice') {
    page = <PracticePage subject={subject} grade={grade} track={track} />;
  } else if (subject?.id === 'english' && view === 'essay') {
    page = <EssayPage grade={grade} />;
  } else if (subject) {
    page = <SubjectPage key={subject.id} subject={subject} grade={grade} initialTrack={track} />;
  } else {
    page = <HomePage grade={grade} />;
  }

  return (
    <div className="min-h-dvh flex flex-col font-sans">
      <TopBar grade={grade} onGradeChange={setGrade} />
      <main key={route.path.join('/')} className="page-enter flex-1 w-full max-w-3xl mx-auto px-5 pb-20">
        {page}
      </main>
    </div>
  );
}
