import type { GradeLevel } from '../data/k12Subjects';

export type AvatarId = 'google' | 'owl' | 'rocket' | 'bot' | 'cat' | 'star';
export type PresetAvatarId = Exclude<AvatarId, 'google'>;

export interface AvatarOption {
  id: PresetAvatarId;
  label: string;
  gradient: string;
}

export const AVATAR_OPTIONS: readonly AvatarOption[] = [
  { id: 'owl', label: '智学猫头鹰', gradient: 'from-emerald-500 to-teal-600' },
  { id: 'rocket', label: '探索小火箭', gradient: 'from-sky-500 to-indigo-600' },
  { id: 'bot', label: 'AI 领航员', gradient: 'from-violet-500 to-purple-600' },
  { id: 'cat', label: '好奇小猫咪', gradient: 'from-amber-500 to-orange-600' },
  { id: 'star', label: '耀眼启明星', gradient: 'from-rose-500 to-pink-600' },
] as const;

export interface PortalProfile {
  displayName: string;
  avatarId: AvatarId;
  grade: GradeLevel;
  updatedAt: number;
}

export const PROFILE_STORAGE_KEY = 'k12_profile_v1';
export const GRADE_STORAGE_KEY = 'k12_grade';
export const MAX_DISPLAY_NAME_LENGTH = 32;

const VALID_AVATAR_IDS = new Set<string>(['google', 'owl', 'rocket', 'bot', 'cat', 'star']);

export function isValidGrade(value: unknown): value is GradeLevel {
  return value === 'G6' || value === 'G7';
}

export function isValidAvatarId(value: unknown): value is AvatarId {
  return typeof value === 'string' && VALID_AVATAR_IDS.has(value);
}

export function sanitizeDisplayName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DISPLAY_NAME_LENGTH);
}

function sanitizeTimestamp(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return 0;
  return Math.floor(raw);
}

function parseGradeFallback(raw: unknown, fallback: GradeLevel): GradeLevel {
  if (isValidGrade(raw)) return raw;
  if (raw === 6 || raw === '6' || raw === '6年级' || raw === 'G6') return 'G6';
  if (raw === 7 || raw === '7' || raw === '7年级' || raw === 'G7') return 'G7';
  return isValidGrade(fallback) ? fallback : 'G6';
}

export function readStoredGrade(fallback: GradeLevel = 'G6'): GradeLevel {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(GRADE_STORAGE_KEY);
      if (isValidGrade(saved)) return saved;
    }
  } catch {
    // Ignore storage read failures in restricted contexts
  }
  return isValidGrade(fallback) ? fallback : 'G6';
}

export function writeStoredGrade(grade: GradeLevel): void {
  if (!isValidGrade(grade)) return;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(GRADE_STORAGE_KEY, grade);
    }
  } catch {
    // Ignore storage write failures
  }
}

export function createInitialProfile(grade: GradeLevel = readStoredGrade()): PortalProfile {
  return {
    displayName: '',
    avatarId: 'owl',
    grade: isValidGrade(grade) ? grade : 'G6',
    updatedAt: 0,
  };
}

export function sanitizeProfile(
  raw: unknown,
  fallbackGrade: GradeLevel = 'G6'
): PortalProfile {
  const safeGrade = isValidGrade(fallbackGrade) ? fallbackGrade : 'G6';
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return createInitialProfile(safeGrade);
  }
  const obj = raw as Record<string, unknown>;
  return {
    displayName: sanitizeDisplayName(obj.displayName),
    avatarId: isValidAvatarId(obj.avatarId) ? obj.avatarId : 'owl',
    grade: parseGradeFallback(obj.grade, safeGrade),
    updatedAt: sanitizeTimestamp(obj.updatedAt),
  };
}

export function extractRemoteProfile(
  userDoc: Record<string, unknown> | null | undefined,
  fallbackGrade: GradeLevel = 'G6',
  hasPhotoUrl = false
): PortalProfile | null {
  if (!userDoc || typeof userDoc !== 'object' || Array.isArray(userDoc)) {
    return null;
  }

  const topLevelName = sanitizeDisplayName(userDoc.name);
  const rawK12 = userDoc.k12Profile;
  if (rawK12 && typeof rawK12 === 'object' && !Array.isArray(rawK12)) {
    const base = sanitizeProfile(rawK12, fallbackGrade);
    return {
      ...base,
      displayName: base.displayName || topLevelName,
      updatedAt: base.updatedAt || (base.displayName || topLevelName ? 1 : 0),
    };
  }

  const rawMath = userDoc.mathgeniusProfile;
  if (rawMath && typeof rawMath === 'object' && !Array.isArray(rawMath)) {
    const mathObj = rawMath as Record<string, unknown>;
    const displayName =
      sanitizeDisplayName(mathObj.displayName) || topLevelName;
    const avatarId = isValidAvatarId(mathObj.avatarId)
      ? mathObj.avatarId
      : hasPhotoUrl
        ? 'google'
        : 'owl';
    const grade = parseGradeFallback(mathObj.grade, fallbackGrade);
    const updatedAt = sanitizeTimestamp(mathObj.updatedAt) || (displayName ? 1 : 0);
    return { displayName, avatarId, grade, updatedAt };
  }

  if (topLevelName) {
    return {
      displayName: topLevelName,
      avatarId: hasPhotoUrl ? 'google' : 'owl',
      grade: isValidGrade(fallbackGrade) ? fallbackGrade : 'G6',
      updatedAt: 1,
    };
  }

  return null;
}

export function mergeProfile(
  local: PortalProfile,
  remote: PortalProfile | null | undefined
): PortalProfile {
  if (!remote) return local;

  const preferRemote = remote.updatedAt >= local.updatedAt;
  const primary = preferRemote ? remote : local;
  const secondary = preferRemote ? local : remote;

  return {
    displayName: primary.displayName || secondary.displayName,
    avatarId: primary.avatarId,
    grade: primary.grade,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  };
}

export function resolveAvatarId(
  avatarId: AvatarId,
  photoURL?: string | null
): AvatarId {
  if (avatarId === 'google' && !photoURL) {
    return 'owl';
  }
  return avatarId;
}

export function resolveProfileName(
  profile: Pick<PortalProfile, 'displayName'>,
  user?: { displayName?: string | null; email?: string | null } | null,
  fallback = '小探索者'
): string {
  const custom = sanitizeDisplayName(profile.displayName);
  if (custom) return custom;

  const authName = sanitizeDisplayName(user?.displayName);
  if (authName) return authName;

  if (user?.email) {
    const emailPrefix = sanitizeDisplayName(user.email.split('@')[0]);
    if (emailPrefix) return emailPrefix;
  }

  return fallback;
}

export function loadLocalProfile(): PortalProfile {
  const fallbackGrade = readStoredGrade();
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (raw) {
        return sanitizeProfile(JSON.parse(raw), fallbackGrade);
      }
    }
  } catch {
    // Fall back cleanly if localStorage is corrupt or unavailable
  }
  return createInitialProfile(fallbackGrade);
}

export function saveLocalProfile(profile: PortalProfile): void {
  const sanitized = sanitizeProfile(profile, profile.grade);
  writeStoredGrade(sanitized.grade);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(sanitized));
    }
  } catch {
    // Ignore storage quota or private-browsing failures
  }
}
