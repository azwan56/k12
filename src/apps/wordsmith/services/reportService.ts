import type { User } from 'firebase/auth';
import { resolvePortalReportTargets } from '../../../k12/guardianLinkService';
import { sendToDiscord } from './discordService';

export type ReportTarget = {
  webhookUrl: string;
  senderName: string;
  destinations?: Array<{ webhookUrl: string; senderName: string }>;
} | null;

/**
 * Resolve where the report should go:
 * - Any linked guardians in /guardian_links matching the student's verified email (preferred)
 * - Fallback to users/{uid}.discordWebhookUrl (student's own webhook)
 * Returns null when nothing is configured.
 */
export async function resolveReportTarget(
  user: User,
  fallbackName: string
): Promise<ReportTarget> {
  const { targets, senderName } = await resolvePortalReportTargets(user, fallbackName);
  if (targets.length === 0) return null;

  const destinations = targets.map((t) => ({
    webhookUrl: t.webhookUrl,
    senderName: t.isGuardian ? `${senderName} (Student Link)` : senderName,
  }));

  return {
    webhookUrl: destinations[0].webhookUrl,
    senderName: destinations[0].senderName,
    destinations,
  };
}

export async function sendReport(
  target: NonNullable<ReportTarget>,
  blob: Blob
): Promise<boolean> {
  const destinations = target.destinations?.length
    ? target.destinations
    : [{ webhookUrl: target.webhookUrl, senderName: target.senderName }];

  const results = await Promise.all(
    destinations.map((dest) => sendToDiscord(dest.webhookUrl, blob, dest.senderName))
  );
  return results.some(Boolean);
}
