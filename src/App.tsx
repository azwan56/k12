import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { RewardsProvider, useRewards } from './hooks/useRewards';
import { ProfileProvider, useProfile } from './hooks/useProfile';
import { getSubject, type GradeLevel } from './data/k12Subjects';
import { formatAccountDisplay, isCnRegion } from './lib/region';
import { isAllowedVanpowerRedirectUrl } from './lib/security';
import {
  clearGuestPendingActivities,
  getGuestPendingActivities,
  subscribePendingQueueChange,
} from './k12/pendingActivityQueue';
import { claimAndFlushGuestActivities } from './k12/studentProgressService';
import { useHashRoute } from './k12/ui';
import TopBar from './k12/TopBar';
import HomePage from './k12/HomePage';
import SubjectPage from './k12/SubjectPage';
import PracticePage from './k12/PracticePage';
import EssayPage from './k12/EssayPage';
import StudentProgressSync from './k12/StudentProgressSync';
import CnLoginModal from './components/CnLoginModal';

const WordsmithApp = lazy(() => import('./apps/wordsmith/WordsmithApp'));
const MathGeniusApp = lazy(() => import('./apps/mathgenius/MathGeniusApp'));
const HumanityApp = lazy(() => import('./apps/humanity/HumanityApp'));
const ParentDashboardPage = lazy(() => import('./k12/ParentDashboardPage'));
const DailyMistakesPage = lazy(() => import('./k12/DailyMistakesPage'));
const IgMathG6ExamPage = lazy(() => import('./k12/IgMathG6ExamPage'));
const BindGuardianPage = lazy(() => import('./k12/BindGuardianPage'));

function AppContent() {
  const { user, loading, needsSSOSync, signInWithGoogle, generateCustomTokenAndRedirect } = useAuth();
  const route = useHashRoute();
  const { profile, resolvedName, effectiveAvatarId, updateProfile } = useProfile();
  const { rewards } = useRewards();
  const [guestPendingCount, setGuestPendingCount] = useState<number>(
    () => getGuestPendingActivities().length
  );
  const [claimingGuest, setClaimingGuest] = useState(false);

  useEffect(() => {
    setGuestPendingCount(getGuestPendingActivities().length);
    return subscribePendingQueueChange(() => {
      setGuestPendingCount(getGuestPendingActivities().length);
    });
  }, []);

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
  const difficulty = route.query.get('d');

  let page: React.ReactNode;
  if (section === 'parent') {
    page = <ParentDashboardPage selectedStudentParam={route.query.get('student')} />;
  } else if (section === 'bind') {
    page = <BindGuardianPage initialCode={route.query.get('code')} />;
  } else if (section === 'mistakes') {
    page = <DailyMistakesPage />;
  } else if (section === 'adventure') {
    page = <HumanityApp grade={grade} />;
  } else if (subject && view === 'practice') {
    page = <PracticePage subject={subject} grade={grade} track={track} initialDifficulty={difficulty} />;
  } else if (subject?.id === 'english' && view === 'wordsmith') {
    page = <WordsmithApp grade={grade} />;
  } else if (subject?.id === 'ig-math' && view === 'mathgenius') {
    page = <MathGeniusApp grade={grade} />;
  } else if (subject?.id === 'ig-math' && view === 'g6-exam') {
    page = <IgMathG6ExamPage />;
  } else if (subject?.id === 'english' && view === 'essay') {
    page = <EssayPage grade={grade} />;
  } else if (subject?.id === 'humanity' && view === 'adventure') {
    page = <HumanityApp grade={grade} />;
  } else if (subject) {
    page = (
      <SubjectPage
        key={subject.id}
        subject={subject}
        grade={grade}
        initialTrack={track}
        initialDifficulty={difficulty}
      />
    );
  } else {
    page = <HomePage grade={grade} />;
  }

  return (
    <div className="min-h-dvh flex flex-col font-sans">
      <TopBar grade={grade} onGradeChange={setGrade} />
      <main key={route.path.join('/')} className="page-enter flex-1 w-full max-w-3xl mx-auto px-5 pb-20">
        {section !== 'parent' && !loading && !user && (
          <div
            role="status"
            className="mt-2 mb-4 rounded-2xl border-2 border-ink bg-amber-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-extrabold text-amber-950"
          >
            <span>
              ⚠️ 当前未登录：练习结果不会自动同步到家长督学看板
              {guestPendingCount > 0 ? `（本机已暂存 ${guestPendingCount} 条待上传）` : ''}
            </span>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="px-3 py-1 rounded-full border-2 border-ink bg-yellow-300 hover:bg-yellow-400 text-xs font-black shrink-0"
            >
              {needsSSOSync ? '同步登录' : '立即登录'}
            </button>
          </div>
        )}
        {section !== 'parent' &&
          !loading &&
          user &&
          guestPendingCount > 0 &&
          view !== 'practice' &&
          view !== 'g6-exam' &&
          view !== 'essay' &&
          view !== 'adventure' &&
          section !== 'adventure' && (
            <div
              role="status"
              className="mt-2 mb-4 rounded-2xl border-2 border-ink bg-violet-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-extrabold text-violet-950"
            >
              <span>
                📥 本机有 {guestPendingCount} 条未登录时完成的练习，是否同步到当前账号（{formatAccountDisplay(user.email, user.provider, user.phone)}）？
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={claimingGuest}
                  onClick={() => {
                    setClaimingGuest(true);
                    void claimAndFlushGuestActivities(user, {
                      profile,
                      resolvedName,
                      effectiveAvatarId,
                      rewards,
                    }).finally(() => setClaimingGuest(false));
                  }}
                  className="px-3 py-1 rounded-full border-2 border-ink bg-yellow-300 hover:bg-yellow-400 text-xs font-black disabled:opacity-50"
                >
                  {claimingGuest ? '同步中…' : '立即同步'}
                </button>
                <button
                  type="button"
                  disabled={claimingGuest}
                  onClick={() => clearGuestPendingActivities()}
                  className="px-3 py-1 rounded-full border-2 border-ink/40 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 disabled:opacity-50"
                >
                  忽略清除
                </button>
              </div>
            </div>
          )}
        <Suspense fallback={<p className="text-xl font-black mt-10">加载中…</p>}>{page}</Suspense>
      </main>
      {isCnRegion() && (
        <footer className="w-full max-w-3xl mx-auto px-5 pb-6 text-center text-[11px] font-bold text-slate-500">
          AI 出题与点评由通义千问提供支持 · 内容由 AI 生成，仅供自主学习辅助
        </footer>
      )}
      {isCnRegion() && <CnLoginModal />}
    </div>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <RewardsProvider>
        <StudentProgressSync />
        <AppContent />
      </RewardsProvider>
    </ProfileProvider>
  );
}
