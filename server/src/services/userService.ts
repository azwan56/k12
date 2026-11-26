import crypto from 'node:crypto';
import type { DbClient, DbQueryRunner } from '../db/database.js';

export interface UserRow {
  id: string;
  internal_email: string;
  display_name: string;
  avatar_id: string;
  photo_url: string | null;
  grade: string;
  provider: string;
  profile_json: string;
  rewards_json: string;
  mathgenius_profile_json: string | null;
  notify_settings_json: string;
  created_at: number;
  updated_at: number;
}

export function buildInternalWeChatEmail(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'user';
  return `u_${safe}@wechat.vanpower.net`.toLowerCase();
}

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function upsertWeChatUser(
  db: DbClient,
  params: {
    openid: string;
    unionid?: string | null;
    nickname?: string | null;
    headimgurl?: string | null;
  }
): Promise<UserRow> {
  const now = Date.now();
  const cleanOpenid = params.openid.trim();
  const cleanUnionid = params.unionid?.trim() || null;

  return db.transaction(async (tx: DbQueryRunner) => {
    let identity = await tx.queryOne<{ user_id: string }>(
      `SELECT user_id FROM user_identities WHERE provider = 'wechat_openid' AND identifier = $1`,
      [cleanOpenid]
    );

    if (!identity && cleanUnionid) {
      identity = await tx.queryOne<{ user_id: string }>(
        `SELECT user_id FROM user_identities WHERE provider = 'wechat_unionid' AND identifier = $1`,
        [cleanUnionid]
      );
    }

    if (identity) {
      const existing = await tx.queryOne<UserRow>(`SELECT * FROM users WHERE id = $1`, [identity.user_id]);
      if (existing) {
        const nextPhoto =
          params.headimgurl && params.headimgurl.startsWith('https://')
            ? params.headimgurl
            : existing.photo_url;
        const nextName = existing.display_name || (params.nickname ? params.nickname.trim().slice(0, 32) : '');
        await tx.execute(
          `UPDATE users SET display_name = $1, photo_url = $2, updated_at = $3 WHERE id = $4`,
          [nextName, nextPhoto, now, existing.id]
        );
        if (cleanUnionid) {
          await tx.execute(
            `INSERT INTO user_identities (id, user_id, provider, identifier, meta_json, created_at)
             VALUES ($1, $2, 'wechat_unionid', $3, $4, $5)
             ON CONFLICT (provider, identifier) DO NOTHING`,
            [`id_${crypto.randomUUID()}`, existing.id, cleanUnionid, JSON.stringify({ openid: cleanOpenid }), now]
          );
        }
        return (await tx.queryOne<UserRow>(`SELECT * FROM users WHERE id = $1`, [existing.id]))!;
      }
    }

    const userId = `wx_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const internalEmail = buildInternalWeChatEmail(userId);
    const displayName = (params.nickname || '').trim().slice(0, 32) || '微信同学';
    const photoUrl =
      params.headimgurl && params.headimgurl.startsWith('https://')
        ? params.headimgurl.slice(0, 512)
        : null;
    const avatarId = photoUrl ? 'google' : 'owl';
    const initialProfile = {
      displayName,
      avatarId,
      grade: 'G6',
      updatedAt: now,
    };

    await tx.execute(
      `INSERT INTO users (
        id, internal_email, display_name, avatar_id, photo_url, grade, provider,
        profile_json, rewards_json, mathgenius_profile_json, notify_settings_json, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'G6', 'wechat', $6, '{}', NULL, '{}', $7, $8)`,
      [userId, internalEmail, displayName, avatarId, photoUrl, JSON.stringify(initialProfile), now, now]
    );

    await tx.execute(
      `INSERT INTO user_identities (id, user_id, provider, identifier, meta_json, created_at)
       VALUES ($1, $2, 'wechat_openid', $3, $4, $5)`,
      [`id_${crypto.randomUUID()}`, userId, cleanOpenid, JSON.stringify({ unionid: cleanUnionid }), now]
    );

    if (cleanUnionid) {
      await tx.execute(
        `INSERT INTO user_identities (id, user_id, provider, identifier, meta_json, created_at)
         VALUES ($1, $2, 'wechat_unionid', $3, $4, $5)
         ON CONFLICT (provider, identifier) DO NOTHING`,
        [`id_${crypto.randomUUID()}`, userId, cleanUnionid, JSON.stringify({ openid: cleanOpenid }), now]
      );
    }

    return (await tx.queryOne<UserRow>(`SELECT * FROM users WHERE id = $1`, [userId]))!;
  });
}

export async function upsertDevUser(
  db: DbClient,
  params: { role: 'student' | 'parent'; suffix?: string }
): Promise<UserRow> {
  const now = Date.now();
  const cleanSuffix = (params.suffix || params.role).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || params.role;
  const userId = `dev_${cleanSuffix}`;
  const internalEmail = buildInternalWeChatEmail(userId);
  const displayName = params.role === 'parent' ? '测试家长' : '测试同学';

  const existing = await db.queryOne<UserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
  if (existing) return existing;

  const initialProfile = {
    displayName,
    avatarId: 'owl',
    grade: 'G6',
    updatedAt: now,
  };

  await db.execute(
    `INSERT INTO users (
      id, internal_email, display_name, avatar_id, photo_url, grade, provider,
      profile_json, rewards_json, mathgenius_profile_json, notify_settings_json, created_at, updated_at
    ) VALUES ($1, $2, $3, 'owl', NULL, 'G6', 'dev', $4, '{}', NULL, '{}', $5, $6)`,
    [userId, internalEmail, displayName, JSON.stringify(initialProfile), now, now]
  );

  await db.execute(
    `INSERT INTO user_identities (id, user_id, provider, identifier, meta_json, created_at)
     VALUES ($1, $2, 'dev', $3, '{}', $4)
     ON CONFLICT (provider, identifier) DO NOTHING`,
    [`id_${crypto.randomUUID()}`, userId, userId, now]
  );

  return (await db.queryOne<UserRow>(`SELECT * FROM users WHERE id = $1`, [userId]))!;
}

export async function getUserOpenId(db: DbClient, userId: string): Promise<string | null> {
  const row = await db.queryOne<{ identifier: string }>(
    `SELECT identifier FROM user_identities WHERE user_id = $1 AND provider = 'wechat_openid' LIMIT 1`,
    [userId]
  );
  return row?.identifier ?? null;
}

export function maskPhoneNumber(phone: string): string {
  const clean = phone.trim();
  if (/^1[3-9]\d{9}$/.test(clean)) {
    return `${clean.slice(0, 3)}****${clean.slice(7)}`;
  }
  return clean;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const expected = Buffer.from(keyHex, 'hex');
    const actual = crypto.scryptSync(password, salt, 64);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function registerPhoneUser(
  db: DbClient,
  params: {
    phone: string;
    password: string;
    displayName?: string;
    grade?: 'G6' | 'G7';
  }
): Promise<UserRow> {
  const phone = params.phone.trim();
  const now = Date.now();

  return db.transaction(async (tx: DbQueryRunner) => {
    const existingIdentity = await tx.queryOne<{ user_id: string }>(
      `SELECT user_id FROM user_identities WHERE provider = 'phone_password' AND identifier = $1`,
      [phone]
    );
    if (existingIdentity) {
      throw new Error('PHONE_ALREADY_REGISTERED');
    }

    const userId = `ph_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const internalEmail = buildInternalWeChatEmail(userId);
    const masked = maskPhoneNumber(phone);
    const cleanName = (params.displayName || '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, 32);
    const displayName = cleanName || `手机用户${phone.slice(-4)}`;
    const grade = params.grade === 'G7' ? 'G7' : 'G6';
    const initialProfile = {
      displayName,
      avatarId: 'owl',
      grade,
      updatedAt: now,
    };
    const passwordHash = hashPassword(params.password);

    await tx.execute(
      `INSERT INTO users (
        id, internal_email, display_name, avatar_id, photo_url, grade, provider,
        profile_json, rewards_json, mathgenius_profile_json, notify_settings_json, created_at, updated_at
      ) VALUES ($1, $2, $3, 'owl', NULL, $4, 'phone', $5, '{}', NULL, '{}', $6, $7)`,
      [userId, internalEmail, displayName, grade, JSON.stringify(initialProfile), now, now]
    );

    await tx.execute(
      `INSERT INTO user_identities (id, user_id, provider, identifier, meta_json, created_at)
       VALUES ($1, $2, 'phone_password', $3, $4, $5)`,
      [
        `id_${crypto.randomUUID()}`,
        userId,
        phone,
        JSON.stringify({ passwordHash, phoneMasked: masked }),
        now,
      ]
    );

    return (await tx.queryOne<UserRow>(`SELECT * FROM users WHERE id = $1`, [userId]))!;
  });
}

export async function authenticatePhoneUser(
  db: DbClient,
  params: { phone: string; password: string }
): Promise<UserRow | null> {
  const phone = params.phone.trim();
  const identity = await db.queryOne<{ user_id: string; meta_json: string }>(
    `SELECT user_id, meta_json FROM user_identities WHERE provider = 'phone_password' AND identifier = $1`,
    [phone]
  );
  if (!identity) return null;

  const meta = safeJsonParse<{ passwordHash?: string }>(identity.meta_json, {});
  if (!meta.passwordHash || !verifyPassword(params.password, meta.passwordHash)) {
    return null;
  }

  return db.queryOne<UserRow>(`SELECT * FROM users WHERE id = $1`, [identity.user_id]);
}

export async function getUserMaskedPhone(db: DbClient, userId: string): Promise<string | null> {
  const identity = await db.queryOne<{ identifier: string }>(
    `SELECT identifier FROM user_identities WHERE user_id = $1 AND provider = 'phone_password' LIMIT 1`,
    [userId]
  );
  return identity?.identifier ? maskPhoneNumber(identity.identifier) : null;
}
