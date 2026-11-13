/**
 * Legacy data migration.
 *
 * Wordsmith and MathGenius used to run on their own subdomains and kept part of their data
 * in that origin's localStorage. After the merge, the old subdomains serve tiny static pages
 * (see /legacy-redirect) that hand that data over to k12.vanpower.live in two ways:
 *   1. Redirect:  old index.html → https://k12.vanpower.live/#import=<payload>&to=<route>
 *   2. Iframe:    k12 loads https://<old>/export.html in a hidden iframe and asks for the data
 *                 via postMessage (covers users who come straight to k12).
 * Both feed into mergeLegacyItems(), which only accepts whitelisted keys and merges safely.
 */

const ALLOWED_KEY = /^(wordsmith_user_history|mathgenius_learning_profile_[\w-]+)$/;

export const LEGACY_ORIGINS = ['https://wordsmith.vanpower.live', 'https://mathgenius.vanpower.live'];

type Items = Record<string, string>;

interface SessionLike {
  id: string;
  timestamp?: number;
}

const safeParse = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export function mergeLegacyItems(items: Items): number {
  let merged = 0;
  for (const [key, incoming] of Object.entries(items)) {
    if (!ALLOWED_KEY.test(key) || typeof incoming !== 'string') continue;
    const current = localStorage.getItem(key);

    if (key === 'wordsmith_user_history') {
      const a = safeParse<SessionLike[]>(current) ?? [];
      const b = safeParse<SessionLike[]>(incoming);
      if (!Array.isArray(b)) continue;
      const byId = new Map<string, SessionLike>();
      [...a, ...b].forEach((s) => s && s.id && byId.set(s.id, s));
      const union = [...byId.values()].sort((x, y) => (y.timestamp ?? 0) - (x.timestamp ?? 0));
      localStorage.setItem(key, JSON.stringify(union));
      merged++;
      continue;
    }

    // mathgenius_learning_profile_<uid>: keep the profile with more completed quizzes.
    const cur = safeParse<{ totalQuizzesTaken?: number }>(current);
    const inc = safeParse<{ totalQuizzesTaken?: number }>(incoming);
    if (!inc) continue;
    if (!cur || (inc.totalQuizzesTaken ?? 0) > (cur.totalQuizzesTaken ?? 0)) {
      localStorage.setItem(key, incoming);
      merged++;
    }
  }
  return merged;
}

const fromBase64Url = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function decodePayload(payload: string): Promise<Items | null> {
  try {
    const kind = payload[0];
    const bytes = fromBase64Url(payload.slice(1));
    let text: string;
    if (kind === 'z' && 'DecompressionStream' in window) {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      text = await new Response(stream).text();
    } else if (kind === 'j') {
      text = new TextDecoder().decode(bytes);
    } else {
      return null;
    }
    const data = JSON.parse(text);
    return data && data.v === 1 && data.items && typeof data.items === 'object' ? data.items : null;
  } catch (e) {
    console.warn('[migrate] could not decode payload', e);
    return null;
  }
}

/** Handle `#import=...&to=...` from a legacy redirect. Call before first render. */
export async function consumeImportHash(): Promise<void> {
  const hash = window.location.hash;
  if (!hash.startsWith('#import=')) return;
  const params = new URLSearchParams(hash.slice(1));
  const payload = params.get('import') ?? '';
  const to = params.get('to') ?? '/';
  const items = await decodePayload(payload);
  if (items) mergeLegacyItems(items);
  const route = to.startsWith('/') ? to : '/';
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${route}`);
}

/** Pull legacy data via hidden iframes. Runs in the background; never blocks the UI. */
export function pullFromLegacyOrigins(): void {
  if (!window.location.hostname.endsWith('vanpower.live')) return;

  for (const origin of LEGACY_ORIGINS) {
    const doneKey = `k12_legacy_pulled_${new URL(origin).hostname}`;
    const triesKey = `${doneKey}_tries`;
    if (localStorage.getItem(doneKey)) continue;
    const tries = Number(localStorage.getItem(triesKey) ?? '0');
    if (tries >= 5) continue;
    localStorage.setItem(triesKey, String(tries + 1));

    const iframe = document.createElement('iframe');
    iframe.src = `${origin}/export.html`;
    iframe.hidden = true;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      iframe.remove();
    };

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || e.source !== iframe.contentWindow) return;
      const data = e.data;
      if (data?.type === 'vp-export-ready') {
        iframe.contentWindow?.postMessage({ type: 'vp-export' }, origin);
      } else if (data?.type === 'vp-export' && data.items && typeof data.items === 'object') {
        mergeLegacyItems(data.items as Items);
        localStorage.setItem(doneKey, String(Date.now()));
        cleanup();
      }
    };

    const timer = window.setTimeout(cleanup, 10000);
    window.addEventListener('message', onMessage);
    document.body.appendChild(iframe);
  }
}
