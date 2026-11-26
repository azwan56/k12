import crypto from 'node:crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { ServerConfig } from '../config.js';
import type { DbClient } from '../db/database.js';
import {
  clearSessionCookie,
  setSessionCookie,
  signSessionToken,
} from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { upsertDevUser, upsertWeChatUser, type UserRow } from '../services/userService.js';
import type { WeChatService } from '../services/wechatService.js';

function formatClientUser(row: {
  id: string;
  internal_email: string;
  display_name: string;
  avatar_id: string;
  photo_url: string | null;
  provider: string;
}) {
  return {
    uid: row.id,
    displayName: row.display_name || '同学',
    email: row.internal_email,
    photoURL: row.photo_url ?? null,
    provider: (row.provider === 'dev' ? 'dev' : 'wechat') as 'wechat' | 'dev',
    wechatBound: row.provider === 'wechat',
  };
}

function sanitizeReturnHash(raw: unknown): string {
  if (typeof raw !== 'string') return '#/';
  const trimmed = raw.trim();
  if (trimmed.startsWith('#/')) return trimmed.slice(0, 240);
  if (trimmed.startsWith('/#/')) return trimmed.slice(1, 241);
  return '#/';
}

export function createAuthRouter(deps: {
  db: DbClient;
  config: ServerConfig;
  wechatService: WeChatService;
}): Router {
  const { db, config, wechatService } = deps;
  const router = Router();
  const qrLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 30 });

  router.get('/me', async (req, res) => {
    if (!req.authUser) {
      res.json({ user: null });
      return;
    }
    const row = await db.queryOne<UserRow>(`SELECT * FROM users WHERE id = $1`, [req.authUser.id]);
    if (!row) {
      res.json({ user: null });
      return;
    }
    res.json({ user: formatClientUser(row) });
  });

  router.post('/logout', (_req, res) => {
    clearSessionCookie(res, config);
    res.json({ ok: true });
  });

  router.get('/wechat/authorize', (req, res) => {
    if (!wechatService.isConfigured()) {
      res.status(503).json({ error: 'WECHAT_NOT_CONFIGURED', message: '微信服务号未配置' });
      return;
    }

    const returnHash = sanitizeReturnHash(req.query.returnTo);
    const nonce = crypto.randomBytes(12).toString('hex');
    const stateToken = jwt.sign({ nonce, returnHash }, config.jwtSecret, { expiresIn: '10m' });

    res.cookie('k12_wx_state', nonce, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60 * 1000,
    });

    const callbackUrl = `${config.appOrigin}/api/auth/wechat/callback`;
    const authUrl = wechatService.buildOAuthAuthorizeUrl({
      redirectUri: callbackUrl,
      state: stateToken,
    });
    res.redirect(302, authUrl);
  });

  router.get('/wechat/callback', async (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code.trim() : '';
    const stateStr = typeof req.query.state === 'string' ? req.query.state.trim() : '';
    const cookieNonce = req.cookies?.k12_wx_state;

    if (!code || !stateStr) {
      res.redirect(302, `${config.appOrigin}/#/?auth_error=missing_code`);
      return;
    }

    let returnHash = '#/';
    try {
      const parsed = jwt.verify(stateStr, config.jwtSecret) as { nonce: string; returnHash?: string };
      if (!cookieNonce || parsed.nonce !== cookieNonce) {
        res.redirect(302, `${config.appOrigin}/#/?auth_error=invalid_state`);
        return;
      }
      returnHash = sanitizeReturnHash(parsed.returnHash);
    } catch {
      res.redirect(302, `${config.appOrigin}/#/?auth_error=expired_state`);
      return;
    }

    res.clearCookie('k12_wx_state', { path: '/' });

    try {
      const wxInfo = await wechatService.exchangeOAuthCode(code);
      const user = await upsertWeChatUser(db, wxInfo);
      const sessionJwt = signSessionToken({ sub: user.id, provider: 'wechat' }, config);
      setSessionCookie(res, sessionJwt, config);
      res.redirect(302, `${config.appOrigin}/${returnHash}`);
    } catch (err) {
      console.error('[auth/wechat/callback] failed:', err);
      res.redirect(302, `${config.appOrigin}/#/?auth_error=wechat_oauth_failed`);
    }
  });

  router.post('/wechat/qr/create', qrLimiter, async (_req, res) => {
    if (!wechatService.isConfigured()) {
      res.status(503).json({ error: 'WECHAT_NOT_CONFIGURED', message: '微信服务号未配置，暂无法生成登录二维码' });
      return;
    }

    const now = Date.now();
    const expireSec = 300;
    const expiresAt = now + expireSec * 1000;
    const sceneId = `k12_${crypto.randomBytes(8).toString('hex')}`;

    try {
      const { qrDataUrl } = await wechatService.createLoginQrCode(sceneId, expireSec);
      await db.execute(
        `INSERT INTO wechat_qr_sessions (scene_id, status, user_id, expires_at, created_at, consumed_at)
         VALUES ($1, 'pending', NULL, $2, $3, NULL)`,
        [sceneId, expiresAt, now]
      );
      res.json({ sceneId, qrDataUrl, expiresAt });
    } catch (err) {
      console.error('[auth/wechat/qr/create] failed:', err);
      res.status(502).json({ error: 'WECHAT_QR_ERROR', message: '生成微信登录二维码失败' });
    }
  });

  router.get('/wechat/qr/status/:sceneId', async (req, res) => {
    const sceneId = (req.params.sceneId || '').trim();
    if (!sceneId || sceneId.length > 64) {
      res.status(400).json({ error: 'INVALID_SCENE_ID' });
      return;
    }

    const row = await db.queryOne<{
      scene_id: string;
      status: string;
      user_id: string | null;
      expires_at: number;
      consumed_at: number | null;
    }>(`SELECT scene_id, status, user_id, expires_at, consumed_at FROM wechat_qr_sessions WHERE scene_id = $1`, [
      sceneId,
    ]);

    if (!row) {
      res.status(404).json({ status: 'expired' });
      return;
    }

    const now = Date.now();
    if (now > Number(row.expires_at)) {
      res.json({ status: 'expired' });
      return;
    }

    if (row.status === 'confirmed' && row.user_id && !row.consumed_at) {
      const user = await db.queryOne<UserRow>(`SELECT * FROM users WHERE id = $1`, [row.user_id]);
      if (!user) {
        res.json({ status: 'expired' });
        return;
      }
      await db.execute(`UPDATE wechat_qr_sessions SET consumed_at = $1 WHERE scene_id = $2`, [now, sceneId]);
      const token = signSessionToken({ sub: user.id, provider: 'wechat' }, config);
      setSessionCookie(res, token, config);
      res.json({ status: 'confirmed', user: formatClientUser(user) });
      return;
    }

    res.json({ status: row.consumed_at ? 'expired' : 'pending' });
  });

  const devLoginSchema = z.object({
    role: z.enum(['student', 'parent']).default('student'),
    suffix: z.string().max(24).optional(),
  });

  router.post('/dev-login', async (req, res) => {
    if (!config.enableDevAuth) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }
    const parsed = devLoginSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_BODY' });
      return;
    }
    const user = await upsertDevUser(db, parsed.data);
    const token = signSessionToken({ sub: user.id, provider: 'dev' }, config);
    setSessionCookie(res, token, config);
    res.json({ user: formatClientUser(user) });
  });

  return router;
}
