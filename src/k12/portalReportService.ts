import type { AppUser } from '../lib/authTypes';
import { toBlob } from 'html-to-image';
import { isValidDiscordWebhookUrl } from '../lib/security';
import { resolvePortalReportTargets } from './guardianLinkService';

export interface ReportDestination {
  webhookUrl: string;
  senderName: string;
}

export interface PortalReportTarget {
  webhookUrl: string;
  senderName: string;
  destinations: ReportDestination[];
}

export async function resolvePortalReportTarget(
  user: AppUser,
  fallbackName: string
): Promise<PortalReportTarget | null> {
  const { targets, senderName } = await resolvePortalReportTargets(user, fallbackName);
  if (targets.length === 0) return null;

  const destinations: ReportDestination[] = targets.map((t) => ({
    webhookUrl: t.webhookUrl,
    senderName: t.isGuardian ? `${senderName} (Student Link)` : senderName,
  }));

  return {
    webhookUrl: destinations[0].webhookUrl,
    senderName: destinations[0].senderName,
    destinations,
  };
}

export async function captureReportPngBlob(
  element: HTMLElement | null,
  backgroundColor = '#ffffff'
): Promise<Blob | null> {
  if (!element) return null;
  try {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready;
    }
    return await toBlob(element, {
      pixelRatio: 2,
      backgroundColor,
      cacheBust: true,
    });
  } catch (err) {
    console.error('[portalReportService] Error generating report PNG:', err);
    return null;
  }
}

export async function sendPortalReportToDiscord(
  target: PortalReportTarget,
  blob: Blob,
  meta: {
    subjectLabel: string;
    scoreSummary: string;
    filePrefix?: string;
  }
): Promise<boolean> {
  const destinations = target.destinations.length
    ? target.destinations
    : [{ webhookUrl: target.webhookUrl, senderName: target.senderName }];

  const safePrefix = (meta.filePrefix || 'K12-Report').replace(/[^A-Za-z0-9_-]/g, '-');

  const results = await Promise.all(
    destinations.map(async (dest) => {
      try {
        const cleanUrl = dest.webhookUrl.trim();
        if (!isValidDiscordWebhookUrl(cleanUrl)) {
          console.error('[portalReportService] Blocked invalid Discord webhook URL');
          return false;
        }
        const formData = new FormData();
        const file = new File([blob], `${safePrefix}-${Date.now()}.png`, {
          type: 'image/png',
        });
        formData.append('file', file);
        formData.append(
          'payload_json',
          JSON.stringify({
            content: `📊 **Vanpower K12 学习报告 · ${meta.subjectLabel}**\n学生：**${dest.senderName}** | 成绩：**${meta.scoreSummary}**\n完成时间：<t:${Math.floor(Date.now() / 1000)}:f>`,
            username: 'Vanpower K12 督学助手',
          })
        );
        const res = await fetch(cleanUrl, { method: 'POST', body: formData });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.error('[portalReportService] Discord webhook error:', res.status, text);
          return false;
        }
        return true;
      } catch (err) {
        console.error('[portalReportService] Failed to send report to Discord:', err);
        return false;
      }
    })
  );

  return results.some(Boolean);
}

export function downloadPngBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareOrDownloadPngBlob(
  blob: Blob,
  filename: string,
  title: string,
  text: string
): Promise<void> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('[portalReportService] Web Share failed, falling back to download:', err);
    }
  }
  downloadPngBlob(blob, filename);
}
