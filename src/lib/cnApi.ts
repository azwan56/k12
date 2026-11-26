import type { AppUser } from './authTypes';
import { getApiBaseUrl } from './region';
import type { PortalProfile } from '../k12/profile';
import type { RewardsState } from '../k12/rewards';
import type { GuardianLink } from '../k12/guardianLinks';
import type { StudentActivityRecord, StudentProgressSummary } from '../k12/studentProgress';

export class CnApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 15000, headers, ...rest } = options;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      ...rest,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
        ...(headers || {}),
      },
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    if (text) {
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        data = { message: text };
      }
    }
    if (!res.ok) {
      throw new CnApiError(
        res.status,
        typeof data.error === 'string' ? data.error : `HTTP_${res.status}`,
        typeof data.message === 'string' ? data.message : `Request failed (${res.status})`
      );
    }
    return data as T;
  } finally {
    window.clearTimeout(timer);
  }
}

export const cnApi = {
  getHealth: () =>
    apiFetch<{ ok: boolean; region: string; wechatConfigured: boolean; devAuthEnabled: boolean }>(
      '/api/health',
      { method: 'GET', timeoutMs: 5000 }
    ),

  getMe: () => apiFetch<{ user: AppUser | null }>('/api/auth/me', { method: 'GET', timeoutMs: 6000 }),

  logout: () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  createWeChatQr: () =>
    apiFetch<{ sceneId: string; qrDataUrl: string; expiresAt: number }>(
      '/api/auth/wechat/qr/create',
      { method: 'POST', timeoutMs: 10000 }
    ),

  pollWeChatQrStatus: (sceneId: string) =>
    apiFetch<{ status: 'pending' | 'confirmed' | 'expired'; user?: AppUser }>(
      `/api/auth/wechat/qr/status/${encodeURIComponent(sceneId)}`,
      { method: 'GET', timeoutMs: 5000 }
    ),

  devLogin: (role: 'student' | 'parent', suffix?: string) =>
    apiFetch<{ user: AppUser }>('/api/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ role, suffix }),
    }),

  getUserState: () =>
    apiFetch<{
      profile: Partial<PortalProfile> | null;
      rewards: Partial<RewardsState> | null;
      mathgeniusProfile: Record<string, unknown> | null;
      notifySettings: { channel?: string; webhookUrl?: string };
    }>('/api/user/state', { method: 'GET' }),

  updateProfile: (profile: PortalProfile) =>
    apiFetch<{ profile: PortalProfile }>('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),

  updateRewards: (rewards: RewardsState) =>
    apiFetch<{ ok: boolean }>('/api/user/rewards', {
      method: 'PUT',
      body: JSON.stringify(rewards),
    }),

  updateMathGeniusProfile: (payload: Record<string, unknown>) =>
    apiFetch<{ ok: boolean }>('/api/user/mathgenius-profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  fetchParentStudentLinks: () =>
    apiFetch<{ links: GuardianLink[] }>('/api/guardian/students', { method: 'GET' }).then((r) => r.links),

  fetchStudentGuardianLinks: () =>
    apiFetch<{ links: GuardianLink[] }>('/api/guardian/parents', { method: 'GET' }).then((r) => r.links),

  createGuardianInvite: () =>
    apiFetch<{ code: string; expiresAt: number }>('/api/guardian/invites', { method: 'POST' }),

  acceptGuardianInvite: (code: string) =>
    apiFetch<{ link: GuardianLink }>('/api/guardian/accept', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }).then((r) => r.link),

  removeGuardianLink: (linkId: string) =>
    apiFetch<{ ok: boolean }>(`/api/guardian/links/${encodeURIComponent(linkId)}`, {
      method: 'DELETE',
    }),

  updateNotifySettings: (channel: 'wechat_tpl' | 'wecom' | 'dingtalk' | 'feishu', webhookUrl: string) =>
    apiFetch<{ ok: boolean; channel: string; webhookUrl: string }>('/api/guardian/notify-settings', {
      method: 'PUT',
      body: JSON.stringify({ channel, webhookUrl }),
    }),

  getProgressSummary: () =>
    apiFetch<{ summary: StudentProgressSummary | null }>('/api/progress/me', { method: 'GET' }),

  putProgressSummary: (summary: StudentProgressSummary) =>
    apiFetch<{ ok: boolean }>('/api/progress/me', {
      method: 'PUT',
      body: JSON.stringify({ summary }),
    }),

  fetchOwnActivities: (limit = 100) =>
    apiFetch<{ activities: StudentActivityRecord[] }>(
      `/api/progress/me/activities?limit=${Math.min(150, Math.max(1, limit))}`,
      { method: 'GET' }
    ).then((r) => r.activities),

  postActivityBatch: (params: {
    activity: StudentActivityRecord;
    summary: StudentProgressSummary;
    isComplete: boolean;
  }) =>
    apiFetch<{ id: string; skipped: boolean }>('/api/progress/me/activities', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  patchActivityFeedback: (activityId: string, aiFeedback: string) =>
    apiFetch<{ ok: boolean }>(
      `/api/progress/me/activities/${encodeURIComponent(activityId)}/feedback`,
      {
        method: 'PATCH',
        body: JSON.stringify({ aiFeedback }),
      }
    ),

  fetchLinkedStudentProgress: (studentUid: string) =>
    apiFetch<{ summary: StudentProgressSummary | null; activities: StudentActivityRecord[] }>(
      `/api/parent/students/${encodeURIComponent(studentUid)}/progress`,
      { method: 'GET' }
    ),

  generateMathQuestions: (payload: {
    language: string;
    category: string;
    difficulty: string;
    weakPoints: string[];
    recentQuestions: string[];
  }) =>
    apiFetch<{ questions: Array<{ id: string; question: string; options: string[]; correctAnswer: string; hint: string; explanation: string; category: string }> }>(
      '/api/ai/math-questions',
      { method: 'POST', body: JSON.stringify(payload), timeoutMs: 45000 }
    ),

  getMathFinalFeedback: (payload: {
    score: number;
    answers: unknown[];
    questions: unknown[];
    language: string;
    category: string;
    difficulty: string;
  }) =>
    apiFetch<{ feedback: string }>('/api/ai/math-feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
      timeoutMs: 30000,
    }),

  generateWordsmithBatch: (words: string[]) =>
    apiFetch<{ data: Array<{ word: string; partOfSpeech: string; definition: string; synonyms: string[] }> }>(
      '/api/ai/wordsmith-batch',
      { method: 'POST', body: JSON.stringify({ words }), timeoutMs: 45000 }
    ),

  evaluateWordsmithSentence: (word: string, sentence: string) =>
    apiFetch<{ data: unknown }>('/api/ai/wordsmith-evaluate', {
      method: 'POST',
      body: JSON.stringify({ word, sentence }),
      timeoutMs: 30000,
    }),

  generatePracticeQuestions: (payload: {
    subjectId: string;
    grade: string;
    trackId?: string;
    trackName?: string;
    topics: string[];
    difficulty: string;
    count: number;
    recentStems: string[];
  }) =>
    apiFetch<{ questions: Array<Record<string, unknown>> }>('/api/ai/practice-questions', {
      method: 'POST',
      body: JSON.stringify(payload),
      timeoutMs: 14000,
    }),
};
