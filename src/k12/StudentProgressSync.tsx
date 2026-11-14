import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useRewards } from '../hooks/useRewards';
import { syncStudentProgressSnapshot } from './studentProgressService';

export default function StudentProgressSync() {
  const { user } = useAuth();
  const { profile, resolvedName, effectiveAvatarId } = useProfile();
  const { rewards } = useRewards();

  useEffect(() => {
    if (!user?.uid || !user?.email) return;
    const timer = window.setTimeout(() => {
      void syncStudentProgressSnapshot(user, {
        profile,
        resolvedName,
        effectiveAvatarId,
        rewards,
      }).catch((err) => {
        console.warn('[StudentProgressSync] Failed to sync progress snapshot:', err);
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    user?.uid,
    user?.email,
    user?.photoURL,
    profile,
    resolvedName,
    effectiveAvatarId,
    rewards,
  ]);

  return null;
}
