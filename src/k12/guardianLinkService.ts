import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { AppUser } from '../lib/authTypes';
import { db } from '../lib/firebase';
import { isCnRegion } from '../lib/region';
import { cnApi } from '../lib/cnApi';
import { isValidDiscordWebhookUrl } from '../lib/security';
import type { AvatarId } from './profile';
import {
  GuardianLink,
  MAX_LINK_NAME_LENGTH,
  MAX_PHOTO_URL_LENGTH,
  WebhookDestination,
  buildGuardianLinkId,
  isValidEmailAddress,
  normalizeEmail,
  resolveGuardianWebhookTargets,
  sanitizeGuardianLink,
  sanitizeLinkText,
} from './guardianLinks';

export const GUARDIAN_LINKS_COLLECTION = 'guardian_links';

export async function fetchParentStudentLinks(parentUid: string): Promise<GuardianLink[]> {
  if (!parentUid) return [];
  if (isCnRegion()) {
    return cnApi.fetchParentStudentLinks();
  }
  const q = query(
    collection(db, GUARDIAN_LINKS_COLLECTION),
    where('parentUid', '==', parentUid)
  );
  const snap = await getDocs(q);
  const links: GuardianLink[] = [];
  snap.forEach((docSnap) => {
    const parsed = sanitizeGuardianLink(docSnap.id, docSnap.data());
    if (parsed) links.push(parsed);
  });
  return links.sort((a, b) => a.studentEmail.localeCompare(b.studentEmail));
}

export async function fetchStudentGuardianLinks(studentEmail: string): Promise<GuardianLink[]> {
  if (isCnRegion()) {
    return cnApi.fetchStudentGuardianLinks();
  }
  const normalized = normalizeEmail(studentEmail);
  if (!isValidEmailAddress(normalized)) return [];
  const q = query(
    collection(db, GUARDIAN_LINKS_COLLECTION),
    where('studentEmail', '==', normalized)
  );
  const snap = await getDocs(q);
  const links: GuardianLink[] = [];
  snap.forEach((docSnap) => {
    const parsed = sanitizeGuardianLink(docSnap.id, docSnap.data());
    if (parsed) links.push(parsed);
  });
  return links.sort((a, b) => a.parentEmail.localeCompare(b.parentEmail));
}

export async function addStudentLink(params: {
  parentUid: string;
  parentEmail: string;
  parentName: string;
  studentEmail: string;
  discordWebhookUrl?: string;
}): Promise<GuardianLink> {
  const normalizedParent = normalizeEmail(params.parentEmail);
  const normalizedStudent = normalizeEmail(params.studentEmail);

  if (!params.parentUid || !isValidEmailAddress(normalizedParent)) {
    throw new Error('INVALID_PARENT_ACCOUNT');
  }
  if (!isValidEmailAddress(normalizedStudent)) {
    throw new Error('INVALID_STUDENT_EMAIL');
  }
  if (normalizedStudent === normalizedParent) {
    throw new Error('CANNOT_ADD_SELF_EMAIL');
  }

  const webhookCandidate = (params.discordWebhookUrl || '').trim();
  if (webhookCandidate && !isValidDiscordWebhookUrl(webhookCandidate)) {
    throw new Error('INVALID_WEBHOOK_URL');
  }

  const linkId = buildGuardianLinkId(params.parentUid, normalizedStudent);
  const now = Date.now();
  const payload = {
    parentUid: params.parentUid,
    parentEmail: normalizedParent,
    parentName:
      sanitizeLinkText(params.parentName, MAX_LINK_NAME_LENGTH) ||
      normalizedParent.split('@')[0] ||
      '家长',
    studentEmail: normalizedStudent,
    discordWebhookUrl: webhookCandidate,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, GUARDIAN_LINKS_COLLECTION, linkId), payload);

  return sanitizeGuardianLink(linkId, payload)!;
}

export async function createGuardianInvite(): Promise<{ code: string; expiresAt: number }> {
  return cnApi.createGuardianInvite();
}

export async function acceptGuardianInvite(code: string): Promise<GuardianLink> {
  return cnApi.acceptGuardianInvite(code);
}

export async function removeGuardianLink(linkId: string): Promise<void> {
  if (!linkId) return;
  if (isCnRegion()) {
    await cnApi.removeGuardianLink(linkId);
    return;
  }
  await deleteDoc(doc(db, GUARDIAN_LINKS_COLLECTION, linkId));
}

export async function syncParentLinksMetadata(
  parentUid: string,
  updates: { parentName?: string; discordWebhookUrl?: string }
): Promise<void> {
  if (!parentUid || isCnRegion()) return;
  const links = await fetchParentStudentLinks(parentUid);
  if (links.length === 0) return;

  const patch: Record<string, unknown> = {
    updatedAt: Date.now(),
  };
  if (updates.parentName !== undefined) {
    patch.parentName =
      sanitizeLinkText(updates.parentName, MAX_LINK_NAME_LENGTH) || '家长';
  }
  if (updates.discordWebhookUrl !== undefined) {
    const trimmed = updates.discordWebhookUrl.trim();
    if (trimmed && !isValidDiscordWebhookUrl(trimmed)) {
      return;
    }
    patch.discordWebhookUrl = trimmed;
  }

  await Promise.all(
    links.map((link) =>
      updateDoc(doc(db, GUARDIAN_LINKS_COLLECTION, link.id), patch)
    )
  );
}

export async function syncStudentLinksProfile(
  studentUser: { uid: string; email?: string | null; photoURL?: string | null },
  profileInfo: { displayName: string; avatarId: AvatarId }
): Promise<void> {
  if (!studentUser.uid || !studentUser.email || isCnRegion()) return;
  const links = await fetchStudentGuardianLinks(studentUser.email);
  if (links.length === 0) return;

  const safeName = sanitizeLinkText(profileInfo.displayName, MAX_LINK_NAME_LENGTH);
  const safePhoto =
    typeof studentUser.photoURL === 'string' &&
    studentUser.photoURL.startsWith('https://') &&
    studentUser.photoURL.length <= MAX_PHOTO_URL_LENGTH
      ? studentUser.photoURL
      : null;

  const staleLinks = links.filter(
    (link) =>
      link.studentUid !== studentUser.uid ||
      link.studentName !== safeName ||
      link.studentAvatarId !== profileInfo.avatarId ||
      link.studentPhotoURL !== safePhoto
  );

  if (staleLinks.length === 0) return;

  const now = Date.now();
  await Promise.all(
    staleLinks.map((link) =>
      updateDoc(doc(db, GUARDIAN_LINKS_COLLECTION, link.id), {
        studentUid: studentUser.uid,
        studentName: safeName,
        studentAvatarId: profileInfo.avatarId,
        studentPhotoURL: safePhoto,
        updatedAt: now,
      })
    )
  );
}

export async function resolvePortalReportTargets(
  user: Pick<AppUser, 'uid' | 'email'>,
  fallbackName: string
): Promise<{ targets: WebhookDestination[]; senderName: string }> {
  if (isCnRegion()) {
    return { targets: [], senderName: fallbackName };
  }
  const snap = await getDoc(doc(db, 'users', user.uid));
  const profile = snap.exists() ? (snap.data() as Record<string, any>) : null;
  const senderName =
    sanitizeLinkText(profile?.name, MAX_LINK_NAME_LENGTH) || fallbackName;
  const ownWebhookUrl =
    typeof profile?.discordWebhookUrl === 'string' ? profile.discordWebhookUrl : '';

  let guardianLinks: GuardianLink[] = [];
  if (user.email) {
    try {
      guardianLinks = await fetchStudentGuardianLinks(user.email);
    } catch (err) {
      console.warn('[guardianLinkService] Failed to query guardian_links:', err);
    }
  }

  const targets = resolveGuardianWebhookTargets(guardianLinks, ownWebhookUrl);
  return { targets, senderName };
}
