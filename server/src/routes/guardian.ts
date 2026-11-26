import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import type { DbClient } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { safeJsonParse, type UserRow } from '../services/userService.js';

interface GuardianLinkRow {
  id: string;
  parent_user_id: string;
  parent_email: string;
  parent_name: string;
  student_user_id: string;
  student_email: string;
  student_name: string;
  student_avatar_id: string;
  student_photo_url: string | null;
  notify_channel: string;
  notify_webhook_url: string;
  created_at: number;
  updated_at: number;
}

function formatLinkRow(row: GuardianLinkRow) {
  return {
    id: row.id,
    parentUid: row.parent_user_id,
    parentEmail: row.parent_email,
    parentName: row.parent_name,
    studentEmail: row.student_email,
    studentUid: row.student_user_id,
    studentName: row.student_name,
    studentAvatarId: row.student_avatar_id || 'owl',
    studentPhotoURL: row.student_photo_url ?? null,
    discordWebhookUrl: row.notify_webhook_url || '',
    notifyChannel: row.notify_channel || 'wechat_tpl',
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function isValidCnWebhookUrl(candidate: string): boolean {
  if (!candidate) return true;
  try {
    const u = new URL(candidate.trim());
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return (
      host === 'qyapi.weixin.qq.com' ||
      host === 'oapi.dingtalk.com' ||
      host === 'open.feishu.cn'
    );
  } catch {
    return false;
  }
}

export function createGuardianRouter(db: DbClient): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/students', async (req, res) => {
    const rows = await db.query<GuardianLinkRow>(
      `SELECT * FROM guardian_links WHERE parent_user_id = $1 ORDER BY created_at DESC`,
      [req.authUser!.id]
    );
    res.json({ links: rows.map(formatLinkRow) });
  });

  router.get('/parents', async (req, res) => {
    const rows = await db.query<GuardianLinkRow>(
      `SELECT * FROM guardian_links WHERE student_user_id = $1 ORDER BY created_at DESC`,
      [req.authUser!.id]
    );
    res.json({ links: rows.map(formatLinkRow) });
  });

  router.post('/invites', async (req, res) => {
    const parent = req.authUser!;
    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000;

    let code = '';
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = String(crypto.randomInt(100000, 999999));
      const existing = await db.queryOne<{ code: string; expires_at: number }>(
        `SELECT code, expires_at FROM guardian_invites WHERE code = $1`,
        [candidate]
      );
      if (!existing || Number(existing.expires_at) < now) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      res.status(500).json({ error: 'INVITE_GEN_FAILED', message: '生成邀请码失败，请重试' });
      return;
    }

    await db.execute(`DELETE FROM guardian_invites WHERE code = $1`, [code]);
    await db.execute(
      `INSERT INTO guardian_invites (code, parent_user_id, parent_name, expires_at, used_by_student_id, created_at)
       VALUES ($1, $2, $3, $4, NULL, $5)`,
      [code, parent.id, parent.displayName || '家长', expiresAt, now]
    );

    res.json({ code, expiresAt });
  });

  const acceptSchema = z.object({
    code: z.string().regex(/^\d{6}$/),
  });

  router.post('/accept', async (req, res) => {
    const parsed = acceptSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_CODE', message: '请输入 6 位数字绑定码' });
      return;
    }

    const student = req.authUser!;
    const now = Date.now();
    const code = parsed.data.code;

    const invite = await db.queryOne<{
      code: string;
      parent_user_id: string;
      parent_name: string;
      expires_at: number;
      used_by_student_id: string | null;
    }>(`SELECT * FROM guardian_invites WHERE code = $1`, [code]);

    if (!invite) {
      res.status(404).json({ error: 'INVITE_NOT_FOUND', message: '绑定码不存在，请向家长确认' });
      return;
    }
    if (now > Number(invite.expires_at)) {
      res.status(410).json({ error: 'INVITE_EXPIRED', message: '绑定码已过期，请让家长重新生成' });
      return;
    }
    if (invite.used_by_student_id && invite.used_by_student_id !== student.id) {
      res.status(409).json({ error: 'INVITE_ALREADY_USED', message: '该绑定码已被使用' });
      return;
    }
    if (invite.parent_user_id === student.id) {
      res.status(400).json({ error: 'CANNOT_BIND_SELF', message: '不能绑定当前登录的同一个账号' });
      return;
    }

    const parentRow = await db.queryOne<UserRow>(`SELECT * FROM users WHERE id = $1`, [invite.parent_user_id]);
    if (!parentRow) {
      res.status(404).json({ error: 'PARENT_NOT_FOUND' });
      return;
    }

    const parentNotify = safeJsonParse<{ channel?: string; webhookUrl?: string }>(
      parentRow.notify_settings_json,
      {}
    );
    const linkId = `${parentRow.id}__${student.id}`;

    await db.transaction(async (tx) => {
      const existing = await tx.queryOne<GuardianLinkRow>(
        `SELECT * FROM guardian_links WHERE parent_user_id = $1 AND student_user_id = $2`,
        [parentRow.id, student.id]
      );
      if (existing) {
        await tx.execute(
          `UPDATE guardian_links
           SET parent_name = $1, student_name = $2, student_avatar_id = $3, student_photo_url = $4, updated_at = $5
           WHERE id = $6`,
          [
            parentRow.display_name || invite.parent_name || '家长',
            student.displayName || '同学',
            student.avatarId || 'owl',
            student.photoURL ?? null,
            now,
            existing.id,
          ]
        );
      } else {
        await tx.execute(
          `INSERT INTO guardian_links (
            id, parent_user_id, parent_email, parent_name,
            student_user_id, student_email, student_name, student_avatar_id, student_photo_url,
            notify_channel, notify_webhook_url, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            linkId,
            parentRow.id,
            parentRow.internal_email,
            parentRow.display_name || invite.parent_name || '家长',
            student.id,
            student.internalEmail,
            student.displayName || '同学',
            student.avatarId || 'owl',
            student.photoURL ?? null,
            parentNotify.channel || 'wechat_tpl',
            parentNotify.webhookUrl || '',
            now,
            now,
          ]
        );
      }

      await tx.execute(`UPDATE guardian_invites SET used_by_student_id = $1 WHERE code = $2`, [
        student.id,
        code,
      ]);
    });

    const saved = await db.queryOne<GuardianLinkRow>(
      `SELECT * FROM guardian_links WHERE parent_user_id = $1 AND student_user_id = $2`,
      [parentRow.id, student.id]
    );

    res.json({ link: saved ? formatLinkRow(saved) : null });
  });

  router.delete('/links/:linkId', async (req, res) => {
    const linkId = (req.params.linkId || '').trim();
    const userId = req.authUser!.id;
    const row = await db.queryOne<GuardianLinkRow>(`SELECT * FROM guardian_links WHERE id = $1`, [linkId]);
    if (!row) {
      res.status(404).json({ error: 'LINK_NOT_FOUND' });
      return;
    }
    if (row.parent_user_id !== userId && row.student_user_id !== userId) {
      res.status(403).json({ error: 'FORBIDDEN' });
      return;
    }
    await db.execute(`DELETE FROM guardian_links WHERE id = $1`, [linkId]);
    res.json({ ok: true });
  });

  const notifySchema = z.object({
    channel: z.enum(['wechat_tpl', 'wecom', 'dingtalk', 'feishu']).default('wechat_tpl'),
    webhookUrl: z.string().max(300).default(''),
  });

  router.put('/notify-settings', async (req, res) => {
    const parsed = notifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_SETTINGS' });
      return;
    }
    const cleanUrl = parsed.data.webhookUrl.trim();
    if (cleanUrl && !isValidCnWebhookUrl(cleanUrl)) {
      res.status(400).json({
        error: 'INVALID_WEBHOOK_URL',
        message: '仅支持企业微信 (qyapi.weixin.qq.com)、钉钉 (oapi.dingtalk.com) 或飞书 (open.feishu.cn) 的 HTTPS 机器人地址',
      });
      return;
    }
    const now = Date.now();
    const userId = req.authUser!.id;
    await db.execute(`UPDATE users SET notify_settings_json = $1, updated_at = $2 WHERE id = $3`, [
      JSON.stringify({ channel: parsed.data.channel, webhookUrl: cleanUrl }),
      now,
      userId,
    ]);
    await db.execute(
      `UPDATE guardian_links SET notify_channel = $1, notify_webhook_url = $2, updated_at = $3 WHERE parent_user_id = $4`,
      [parsed.data.channel, cleanUrl, now, userId]
    );
    res.json({ ok: true, channel: parsed.data.channel, webhookUrl: cleanUrl });
  });

  return router;
}
