import { Router } from 'express';
import { z } from 'zod';
import type { DbClient } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { safeJsonParse, type UserRow } from '../services/userService.js';

const profileSchema = z.object({
  displayName: z.string().max(32),
  avatarId: z.enum(['google', 'owl', 'rocket', 'bot', 'cat', 'star']),
  grade: z.enum(['G6', 'G7']),
  updatedAt: z.number().int().nonnegative(),
});

const rewardsSchema = z.record(z.unknown());
const mathProfileSchema = z.record(z.unknown());

export function createUserRouter(db: DbClient): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/state', async (req, res) => {
    const userId = req.authUser!.id;
    const row = await db.queryOne<UserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (!row) {
      res.status(404).json({ error: 'USER_NOT_FOUND' });
      return;
    }

    res.json({
      profile: safeJsonParse(row.profile_json, null),
      rewards: safeJsonParse(row.rewards_json, null),
      mathgeniusProfile: safeJsonParse(row.mathgenius_profile_json, null),
      notifySettings: safeJsonParse(row.notify_settings_json, {}),
    });
  });

  router.put('/profile', async (req, res) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_PROFILE', details: parsed.error.flatten() });
      return;
    }

    const userId = req.authUser!.id;
    const now = Date.now();
    const cleanName = parsed.data.displayName.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, 32);
    const nextProfile = {
      ...parsed.data,
      displayName: cleanName,
      updatedAt: parsed.data.updatedAt || now,
    };

    await db.execute(
      `UPDATE users SET display_name = $1, avatar_id = $2, grade = $3, profile_json = $4, updated_at = $5 WHERE id = $6`,
      [cleanName || req.authUser!.displayName, nextProfile.avatarId, nextProfile.grade, JSON.stringify(nextProfile), now, userId]
    );

    if (cleanName) {
      await db.execute(
        `UPDATE guardian_links SET student_name = $1, student_avatar_id = $2, updated_at = $3 WHERE student_user_id = $4`,
        [cleanName, nextProfile.avatarId, now, userId]
      );
      await db.execute(
        `UPDATE guardian_links SET parent_name = $1, updated_at = $2 WHERE parent_user_id = $3`,
        [cleanName, now, userId]
      );
    }

    res.json({ profile: nextProfile });
  });

  router.put('/rewards', async (req, res) => {
    const parsed = rewardsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_REWARDS' });
      return;
    }
    const userId = req.authUser!.id;
    const now = Date.now();
    await db.execute(`UPDATE users SET rewards_json = $1, updated_at = $2 WHERE id = $3`, [
      JSON.stringify(parsed.data),
      now,
      userId,
    ]);
    res.json({ ok: true });
  });

  router.put('/mathgenius-profile', async (req, res) => {
    const parsed = mathProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_MATH_PROFILE' });
      return;
    }
    const userId = req.authUser!.id;
    const now = Date.now();
    await db.execute(`UPDATE users SET mathgenius_profile_json = $1, updated_at = $2 WHERE id = $3`, [
      JSON.stringify(parsed.data),
      now,
      userId,
    ]);
    res.json({ ok: true });
  });

  return router;
}
