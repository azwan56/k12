import { isValidDiscordWebhookUrl } from '../lib/security';
import { AvatarId, isValidAvatarId } from './profile';

export const MAX_EMAIL_LENGTH = 254;
export const MAX_LINK_NAME_LENGTH = 64;
export const MAX_WEBHOOK_LENGTH = 300;
export const MAX_PHOTO_URL_LENGTH = 512;

export interface GuardianLink {
  id: string;
  parentUid: string;
  parentEmail: string;
  parentName: string;
  studentEmail: string;
  studentUid: string | null;
  studentName: string;
  studentAvatarId: AvatarId;
  studentPhotoURL: string | null;
  discordWebhookUrl: string;
  createdAt: number;
  updatedAt: number;
}

const BASIC_EMAIL_RE = /^[a-z0-9._%+-]+@(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]{1,}$/;

export function normalizeEmail(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .toLowerCase()
    .slice(0, MAX_EMAIL_LENGTH);
}

export function isValidEmailAddress(raw: unknown): boolean {
  const normalized = normalizeEmail(raw);
  return Boolean(normalized) && BASIC_EMAIL_RE.test(normalized);
}

export function sanitizeLinkText(raw: unknown, maxLen = MAX_LINK_NAME_LENGTH): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function buildGuardianLinkId(parentUid: string, studentEmail: string): string {
  const safeParent = sanitizeLinkText(parentUid, 128).replace(/\//g, '');
  const safeEmail = normalizeEmail(studentEmail);
  return `${safeParent}__${encodeURIComponent(safeEmail)}`;
}

function sanitizeSafeTimestamp(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return 0;
  return Math.floor(raw);
}

export function sanitizeGuardianLink(id: string, raw: unknown): GuardianLink | null {
  if (!id || !raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;

  const parentUid = sanitizeLinkText(obj.parentUid, 128);
  const parentEmail = normalizeEmail(obj.parentEmail);
  const studentEmail = normalizeEmail(obj.studentEmail);
  if (!parentUid || !isValidEmailAddress(parentEmail) || !isValidEmailAddress(studentEmail)) {
    return null;
  }

  const webhookCandidate = typeof obj.discordWebhookUrl === 'string' ? obj.discordWebhookUrl.trim() : '';
  const discordWebhookUrl =
    webhookCandidate &&
    webhookCandidate.length <= MAX_WEBHOOK_LENGTH &&
    isValidDiscordWebhookUrl(webhookCandidate)
      ? webhookCandidate
      : '';

  const studentPhotoURL =
    typeof obj.studentPhotoURL === 'string' &&
    obj.studentPhotoURL.startsWith('https://') &&
    obj.studentPhotoURL.length <= MAX_PHOTO_URL_LENGTH
      ? obj.studentPhotoURL
      : null;

  return {
    id,
    parentUid,
    parentEmail,
    parentName: sanitizeLinkText(obj.parentName, MAX_LINK_NAME_LENGTH) || parentEmail.split('@')[0] || '家长',
    studentEmail,
    studentUid: typeof obj.studentUid === 'string' && obj.studentUid.trim() ? obj.studentUid.trim().slice(0, 128) : null,
    studentName: sanitizeLinkText(obj.studentName, MAX_LINK_NAME_LENGTH),
    studentAvatarId: isValidAvatarId(obj.studentAvatarId)
      ? obj.studentAvatarId
      : studentPhotoURL
        ? 'google'
        : 'owl',
    studentPhotoURL,
    discordWebhookUrl,
    createdAt: sanitizeSafeTimestamp(obj.createdAt),
    updatedAt: sanitizeSafeTimestamp(obj.updatedAt),
  };
}

export interface WebhookDestination {
  webhookUrl: string;
  isGuardian: boolean;
}

/**
 * Resolve Discord webhook destinations for a student's report:
 * - Prefer all valid guardian webhooks linked to the student's email (deduplicated).
 * - Fall back to the student's own configured webhook when no guardian webhook exists.
 */
export function resolveGuardianWebhookTargets(
  guardianLinks: readonly Pick<GuardianLink, 'discordWebhookUrl'>[],
  ownWebhookUrl?: string | null
): WebhookDestination[] {
  const seen = new Set<string>();
  const destinations: WebhookDestination[] = [];

  for (const link of guardianLinks) {
    const candidate = (link.discordWebhookUrl || '').trim();
    if (candidate && isValidDiscordWebhookUrl(candidate) && !seen.has(candidate)) {
      seen.add(candidate);
      destinations.push({ webhookUrl: candidate, isGuardian: true });
    }
  }

  if (destinations.length > 0) {
    return destinations;
  }

  const own = (ownWebhookUrl || '').trim();
  if (own && isValidDiscordWebhookUrl(own)) {
    return [{ webhookUrl: own, isGuardian: false }];
  }

  return [];
}
