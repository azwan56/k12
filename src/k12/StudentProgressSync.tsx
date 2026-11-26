import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useRewards } from '../hooks/useRewards';
import {
  flushPendingActivitiesForUser,
  syncStudentProgressSnapshot,
} from './studentProgressService';

export default function StudentProgressSync() {
  const { user } = useAuth();
  const { profile, resolvedName, effectiveAvatarId } = useProfile();
  const { rewards } = useRewards();

  const latestRef = useRef({
    user,
    meta: { profile, resolvedName, effectiveAvatarId, rewards },
  });
  latestRef.current = {
    user,
    meta: { profile, resolvedName, effectiveAvatarId, rewards },
  };

  useEffect(() => {
    if (!user?.uid || !user?.email) return;

    const flushNow = () => {
      const { user: curUser, meta } = latestRef.current;
      if (!curUser?.uid || !curUser?.email) return;
      void flushPendingActivitiesForUser(curUser, meta).catch((err) => {
        console.warn('[StudentProgressSync] Failed to flush pending activities:', err);
      });
    };

    // Flush any queued entries for this user immediately upon auth ready
    flushNow();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        flushNow();
      }
    };

    window.addEventListener('online', flushNow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', flushNow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.uid, user?.email]);

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
