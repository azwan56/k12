import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isCnRegion } from '../lib/region';
import { cnApi } from '../lib/cnApi';
import { useAuth } from './useAuth';
import {
  AvatarId,
  PortalProfile,
  extractRemoteProfile,
  loadLocalProfile,
  mergeProfile,
  resolveAvatarId,
  resolveProfileName,
  sanitizeProfile,
  saveLocalProfile,
} from '../k12/profile';
import {
  syncParentLinksMetadata,
  syncStudentLinksProfile,
} from '../k12/guardianLinkService';

export type ProfilePatch = Partial<Pick<PortalProfile, 'displayName' | 'avatarId' | 'grade'>>;

interface ProfileContextType {
  profile: PortalProfile;
  resolvedName: string;
  effectiveAvatarId: AvatarId;
  isSyncing: boolean;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PortalProfile>(() => loadLocalProfile());
  const [isSyncing, setIsSyncing] = useState(false);
  const profileRef = useRef<PortalProfile>(profile);
  const syncedUidRef = useRef<string | null>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const persistRemoteProfile = useCallback(
    async (
      nextProfile: PortalProfile,
      currentUser: { uid: string; displayName: string | null; email: string | null; photoURL: string | null },
      isNewDoc = false
    ) => {
      if (isCnRegion()) {
        await cnApi.updateProfile(nextProfile);
        return;
      }
      const userRef = doc(db, 'users', currentUser.uid);
      const effectiveName = resolveProfileName(nextProfile, currentUser, 'User');
      const payload: Record<string, unknown> = {
        uid: currentUser.uid,
        email: currentUser.email ?? null,
        name: effectiveName,
        photoURL: currentUser.photoURL ?? null,
        k12Profile: nextProfile,
      };
      if (isNewDoc) {
        payload.createdAt = Date.now();
      }
      await setDoc(userRef, payload, { merge: true });
    },
    []
  );

  useEffect(() => {
    if (!user?.uid) {
      syncedUidRef.current = null;
      return;
    }
    if (syncedUidRef.current === user.uid) return;

    let cancelled = false;
    setIsSyncing(true);

    (async () => {
      try {
        const local = loadLocalProfile();
        if (isCnRegion()) {
          const state = await cnApi.getUserState();
          if (cancelled) return;
          const remote = state.profile ? sanitizeProfile(state.profile, local.grade) : null;
          let merged = mergeProfile(local, remote);
          if (!state.profile && local.updatedAt === 0 && user.photoURL && merged.avatarId === 'owl') {
            merged = { ...merged, avatarId: 'google' };
          }
          profileRef.current = merged;
          setProfile(merged);
          saveLocalProfile(merged);
          if (!state.profile || local.updatedAt > (remote?.updatedAt ?? 0)) {
            const toPush: PortalProfile =
              merged.updatedAt === 0 ? { ...merged, updatedAt: Date.now() } : merged;
            if (toPush !== merged) {
              profileRef.current = toPush;
              setProfile(toPush);
              saveLocalProfile(toPush);
            }
            await cnApi.updateProfile(toPush);
          }
          if (!cancelled) {
            syncedUidRef.current = user.uid;
          }
          return;
        }

        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (cancelled) return;

        const data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
        const remote = extractRemoteProfile(data, local.grade, Boolean(user.photoURL));
        let merged = mergeProfile(local, remote);

        // First-time Google user with untouched local profile defaults to their Google photo
        if (
          !data?.k12Profile &&
          local.updatedAt === 0 &&
          user.photoURL &&
          merged.avatarId === 'owl'
        ) {
          merged = { ...merged, avatarId: 'google' };
        }

        profileRef.current = merged;
        setProfile(merged);
        saveLocalProfile(merged);

        const shouldPushRemote =
          !snap.exists() ||
          !data?.k12Profile ||
          local.updatedAt > (remote?.updatedAt ?? 0);

        if (shouldPushRemote) {
          const toPush: PortalProfile =
            merged.updatedAt === 0 ? { ...merged, updatedAt: Date.now() } : merged;
          if (toPush !== merged) {
            profileRef.current = toPush;
            setProfile(toPush);
            saveLocalProfile(toPush);
          }
          await persistRemoteProfile(toPush, user, !snap.exists());
        }

        if (!cancelled) {
          syncedUidRef.current = user.uid;
          const syncedName = resolveProfileName(merged, user, 'User');
          const syncedAvatar = resolveAvatarId(
            merged.updatedAt === 0 && user.photoURL && merged.avatarId === 'owl'
              ? 'google'
              : merged.avatarId,
            user.photoURL
          );
          void syncStudentLinksProfile(user, {
            displayName: syncedName,
            avatarId: syncedAvatar,
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('[useProfile] Failed to sync profile with Firestore:', err);
      } finally {
        if (!cancelled) {
          setIsSyncing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, persistRemoteProfile]);

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      const base = profileRef.current;
      const next = sanitizeProfile(
        {
          ...base,
          ...patch,
          updatedAt: Date.now(),
        },
        patch.grade ?? base.grade
      );

      profileRef.current = next;
      setProfile(next);
      saveLocalProfile(next);

      if (!user?.uid) return;
      try {
        await persistRemoteProfile(next, user, false);
        const syncedName = resolveProfileName(next, user, 'User');
        const syncedAvatar = resolveAvatarId(next.avatarId, user.photoURL);
        void syncStudentLinksProfile(user, {
          displayName: syncedName,
          avatarId: syncedAvatar,
        }).catch(() => {});
        void syncParentLinksMetadata(user.uid, {
          parentName: syncedName,
        }).catch(() => {});
      } catch (err) {
        console.warn('[useProfile] Failed to save profile to Firestore:', err);
      }
    },
    [user, persistRemoteProfile]
  );

  // If user is signed in with Google and has never picked a custom avatar, display Google photo
  const effectiveAvatarId = resolveAvatarId(
    !user && profile.avatarId === 'google'
      ? 'owl'
      : profile.updatedAt === 0 && user?.photoURL && profile.avatarId === 'owl'
        ? 'google'
        : profile.avatarId,
    user?.photoURL
  );

  const resolvedName = resolveProfileName(
    profile,
    user,
    user ? '同学' : '小探索者'
  );

  return (
    <ProfileContext.Provider
      value={{
        profile,
        resolvedName,
        effectiveAvatarId,
        isSyncing,
        updateProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export function useProfile(): ProfileContextType {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return ctx;
}
