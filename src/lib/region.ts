export type AppRegion = 'global' | 'cn';

export interface RegionResolveOptions {
  envRegion?: string;
  hostname?: string;
}

export function resolveAppRegion(options?: RegionResolveOptions): AppRegion {
  const rawEnv =
    options?.envRegion !== undefined
      ? options.envRegion
      : (import.meta as { env?: { VITE_APP_REGION?: string } }).env?.VITE_APP_REGION;

  const normalizedEnv = typeof rawEnv === 'string' ? rawEnv.trim().toLowerCase() : '';
  if (normalizedEnv === 'cn') return 'cn';
  if (normalizedEnv === 'global') return 'global';

  const hostname =
    options?.hostname !== undefined
      ? options.hostname
      : typeof window !== 'undefined'
        ? window.location.hostname
        : '';

  const lowerHost = hostname.trim().toLowerCase();
  if (lowerHost === 'vanpower.net' || lowerHost.endsWith('.vanpower.net')) {
    return 'cn';
  }
  return 'global';
}

export function getAppRegion(): AppRegion {
  return resolveAppRegion();
}

export function isCnRegion(): boolean {
  return getAppRegion() === 'cn';
}

export function getApiBaseUrl(): string {
  const rawBase = (import.meta as { env?: { VITE_CN_API_BASE?: string } }).env?.VITE_CN_API_BASE;
  if (typeof rawBase === 'string' && rawBase.trim()) {
    return rawBase.trim().replace(/\/+$/, '');
  }
  return '';
}

export function isWeChatBrowser(ua?: string): boolean {
  const agent =
    ua !== undefined
      ? ua
      : typeof navigator !== 'undefined'
        ? navigator.userAgent
        : '';
  return /MicroMessenger/i.test(agent);
}

export function isMobileBrowser(ua?: string): boolean {
  const agent =
    ua !== undefined
      ? ua
      : typeof navigator !== 'undefined'
        ? navigator.userAgent
        : '';
  return /Android|iPhone|iPad|iPod|Mobile|MicroMessenger/i.test(agent);
}

export function getCookieDomain(hostname?: string): string {
  const host =
    hostname !== undefined
      ? hostname
      : typeof window !== 'undefined'
        ? window.location.hostname
        : '';
  const lower = host.trim().toLowerCase();
  if (lower === 'vanpower.net' || lower.endsWith('.vanpower.net')) {
    return '.vanpower.net';
  }
  if (lower === 'vanpower.live' || lower.endsWith('.vanpower.live')) {
    return '.vanpower.live';
  }
  return host;
}

const SYNTHETIC_CN_EMAIL_RE = /^u_[^@]+@wechat\.vanpower\.net$/i;

export function isSyntheticCnEmail(email?: string | null): boolean {
  return typeof email === 'string' && SYNTHETIC_CN_EMAIL_RE.test(email.trim());
}

export function formatAccountDisplay(
  email?: string | null,
  provider?: string | null,
  phone?: string | null
): string {
  if (phone && phone.trim()) {
    return phone.trim();
  }
  if (email && !isSyntheticCnEmail(email)) {
    return email;
  }
  if (provider === 'phone') return '手机号账号';
  if (provider === 'wechat') return '微信已登录 · 家庭学习档案';
  if (provider === 'dev') return '本地联调账号';
  return isCnRegion() ? '已登录账号' : '已登录账号';
}
