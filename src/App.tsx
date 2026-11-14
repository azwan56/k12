import React, { Suspense, lazy, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { RewardsProvider } from './hooks/useRewards';
import { ProfileProvider, useProfile } from './hooks/useProfile';
import { getSubject, type GradeLevel } from './data/k12Subjects';
import { isAllowedVanpowerRedirectUrl } from './lib/security';
import { useHashRoute } from './k12/ui';
import TopBar from './k12/TopBar';
import HomePage from './k12/HomePage';
import SubjectPage from './k12/SubjectPage';
import PracticePage from './k12/PracticePage';
import EssayPage from './k12/EssayPage';

const WordsmithApp = lazy(() => import('./apps/wordsmith/WordsmithApp'));
const MathGeniusApp = lazy(() => import('./apps/mathgenius/MathGeniusApp'));

function AppContent() {
  const { user, loading, generateCustomTokenAndRedirect } = useAuth();
  const route = useHashRoute();
  const { profile, updateProfile } = useProfile();
  const grade = profile.grade;
  const setGrade = (g: GradeLevel) => {
    void updateProfile({ grade: g });
  };

  // Cross-domain SSO bounce: other *.vanpower.live apps send users here to mint a token.
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect');
    if (params.get('sso_bounce') !== 'true' || !redirectUrl) return;
    if (!isAllowedVanpowerRedirectUrl(redirectUrl)) {
      console.error('Blocked untrusted SSO redirect target:', redirectUrl);
      return;
    }

    if (user) {
      generateCustomTokenAndRedirect(redirectUrl).catch((e) => {
        console.error('SSO Bounce Custom Token generation failed', e);
        window.location.href = redirectUrl;
      });
    } else {
      const target = new URL(redirectUrl);
      target.searchParams.set('sso_failed', 'true');
      window.location.href = target.toString();
    }
  }, [loading, user, generateCustomTokenAndRedirect]);

  const [section, subjectId, view] = route.path;
  const subject = section === 's' ? getSubject(subjectId) : undefined;
  const track = route.query.get('t');

  let page: React.ReactNode;
  if (subject && view === 'practice') {
    page = <PracticePage subject={subject} grade={grade} track={track} />;
  } else if (subject?.id === 'english' && view === 'wordsmith') {
    page = <WordsmithApp grade={grade} />;
  } else if (subject?.id === 'ig-math' && view === 'mathgenius') {
    page = <MathGeniusApp grade={grade} />;
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
        <Suspense fallback={<p className="text-xl font-black mt-10">加载中…</p>}>{page}</Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <RewardsProvider>
        <AppContent />
      </RewardsProvider>
    </ProfileProvider>
  );
}
