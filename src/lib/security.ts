const TRUSTED_VANPOWER_URL = 'https://vanpower.live';
const TRUSTED_VANPOWER_DOMAIN = 'vanpower.live';

interface OriginLike {
  opaque: boolean;
  isSameOrigin(other: OriginLike): boolean;
  isSameSite(other: OriginLike): boolean;
}

interface OriginConstructor {
  from(value: unknown): OriginLike;
}

/**
 * Validate cross-subdomain SSO redirect targets (*.vanpower.live) using the
 * standard `Origin` API (`isSameSite`) when available, with a strict `URL`
 * parser fallback that blocks scheme downgrades, opaque origins (`data:`),
 * `javascript:` URIs, and prefix/substring spoofing.
 */
export function isAllowedVanpowerRedirectUrl(
  candidate: string,
  allowLocalhostDev: boolean = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV)
): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  const trimmed = candidate.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    if (parsed.origin === 'null') return false;

    if (
      allowLocalhostDev &&
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return true;
    }

    const OriginApi = (globalThis as unknown as { Origin?: OriginConstructor }).Origin;
    if (typeof OriginApi?.from === 'function') {
      const candidateOrigin = OriginApi.from(trimmed);
      if (candidateOrigin.opaque) return false;
      return candidateOrigin.isSameSite(OriginApi.from(TRUSTED_VANPOWER_URL));
    }

    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === TRUSTED_VANPOWER_DOMAIN ||
        parsed.hostname.endsWith(`.${TRUSTED_VANPOWER_DOMAIN}`))
    );
  } catch {
    return false;
  }
}

const DISCORD_WEBHOOK_HOSTS = new Set([
  'discord.com',
  'discordapp.com',
  'ptb.discord.com',
  'canary.discord.com'
]);

const DISCORD_WEBHOOK_PATH_RE = /^\/api\/(?:v\d+\/)?webhooks\/\d+\/[\w-]+$/;

/**
 * Validate that a user-supplied Webhook URL points strictly to an official
 * HTTPS Discord incoming webhook endpoint before saving or POSTing reports.
 */
export function isValidDiscordWebhookUrl(candidate: string): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  try {
    const parsed = new URL(candidate.trim());
    if (parsed.origin === 'null' || parsed.protocol !== 'https:') return false;
    if (!DISCORD_WEBHOOK_HOSTS.has(parsed.hostname.toLowerCase())) return false;
    return DISCORD_WEBHOOK_PATH_RE.test(parsed.pathname);
  } catch {
    return false;
  }
}
