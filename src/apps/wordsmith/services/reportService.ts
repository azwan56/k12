import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../../../lib/firebase';
import { sendToDiscord } from './discordService';

export type ReportTarget = { webhookUrl: string; senderName: string } | null;

/**
 * Resolve where the report should go, using the portal-wide users/{uid} profile:
 * - users/{uid}.discordWebhookUrl (the student's own webhook)
 * - users/{uid}.guardianEmail → the guardian's users doc .discordWebhookUrl (preferred if present)
 * Returns null when nothing is configured.
 */
export async function resolveReportTarget(user: User, fallbackName: string): Promise<ReportTarget> {
  const snap = await getDoc(doc(db, 'users', user.uid));
  const profile = snap.exists() ? (snap.data() as Record<string, any>) : null;
  if (!profile || (!profile.discordWebhookUrl && !profile.guardianEmail)) return null;

  let webhookUrl: string | undefined = profile.discordWebhookUrl || undefined;
  let senderName: string = profile.name || fallbackName;

  if (profile.guardianEmail) {
    const q = query(collection(db, 'users'), where('email', '==', profile.guardianEmail));
    const res = await getDocs(q);
    if (!res.empty) {
      const guardian = res.docs[0].data();
      if (guardian.discordWebhookUrl) {
        webhookUrl = guardian.discordWebhookUrl;
        senderName = `${senderName} (Student Link)`;
      }
    }
  }

  if (!webhookUrl) throw new Error('No valid webhook found.');
  return { webhookUrl, senderName };
}

export async function sendReport(target: NonNullable<ReportTarget>, blob: Blob): Promise<boolean> {
  return sendToDiscord(target.webhookUrl, blob, target.senderName);
}
