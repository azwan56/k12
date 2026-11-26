import { Router } from 'express';
import { z } from 'zod';
import type { ServerConfig } from '../config.js';
import type { DbClient } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserOpenId, safeJsonParse } from '../services/userService.js';
import type { WeChatService } from '../services/wechatService.js';

const activityRecordSchema = z.object({
  id: z.string().min(1).max(128),
  type: z.enum(['practice', 'wordsmith', 'mathgenius', 'essay', 'humanity']),
  subjectId: z.enum(['english', 'ig-math', 'shanghai-math', 'humanity', 'science']),
  title: z.string().min(1).max(160),
  grade: z.enum(['G6', 'G7']),
  score: z.number().int().nonnegative(),
  maxScore: z.number().int().nonnegative(),
  accuracyPct: z.number().int().min(0).max(100),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
}).passthrough();

const postActivitySchema = z.object({
  activity: activityRecordSchema,
  summary: z.record(z.unknown()),
  isComplete: z.boolean().default(true),
});

async function notifyParentsOnActivityComplete(params: {
  db: DbClient;
  config: ServerConfig;
  wechatService: WeChatService;
  studentUid: string;
  studentName: string;
  subjectTitle: string;
  scoreSummary: string;
}) {
  const { db, config, wechatService, studentUid, studentName, subjectTitle, scoreSummary } = params;
  try {
    const parents = await db.query<{
      parent_user_id: string;
      notify_channel: string;
      notify_webhook_url: string;
    }>(
      `SELECT parent_user_id, notify_channel, notify_webhook_url FROM guardian_links WHERE student_user_id = $1`,
      [studentUid]
    );

    for (const p of parents) {
      const openid = await getUserOpenId(db, p.parent_user_id);
      if (openid) {
        void wechatService.sendReportTemplateMessage({
          toOpenId: openid,
          studentName,
          subjectTitle,
          scoreSummary,
          targetUrl: `${config.appOrigin}/#/parent?student=${encodeURIComponent(studentUid)}`,
        });
      }
      if (p.notify_webhook_url && p.notify_channel !== 'wechat_tpl') {
        const text = `📊 Vanpower K12 学习通知\n学生：${studentName}\n科目：${subjectTitle}\n成绩：${scoreSummary}\n查看详情：${config.appOrigin}/#/parent`;
        const body =
          p.notify_channel === 'feishu'
            ? { msg_type: 'text', content: { text } }
            : { msgtype: 'text', text: { content: text } };
        void fetch(p.notify_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[progress] parent notification failed:', err);
  }
}

export function createProgressRouter(deps: {
  db: DbClient;
  config: ServerConfig;
  wechatService: WeChatService;
}): Router {
  const { db, config, wechatService } = deps;
  const router = Router();
  router.use(requireAuth);

  router.get('/progress/me', async (req, res) => {
    const row = await db.queryOne<{ summary_json: string }>(
      `SELECT summary_json FROM student_progress WHERE student_user_id = $1`,
      [req.authUser!.id]
    );
    res.json({ summary: safeJsonParse(row?.summary_json, null) });
  });

  router.put('/progress/me', async (req, res) => {
    const summary = req.body?.summary;
    if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
      res.status(400).json({ error: 'INVALID_SUMMARY' });
      return;
    }
    const now = Date.now();
    const uid = req.authUser!.id;
    await db.execute(
      `INSERT INTO student_progress (student_user_id, summary_json, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_user_id) DO UPDATE SET summary_json = EXCLUDED.summary_json, updated_at = EXCLUDED.updated_at`,
      [uid, JSON.stringify({ ...summary, studentUid: uid, studentEmail: req.authUser!.internalEmail }), now]
    );
    res.json({ ok: true });
  });

  router.get('/progress/me/activities', async (req, res) => {
    const rawLimit = Number(req.query.limit || 100);
    const maxCount = Number.isFinite(rawLimit) ? Math.min(150, Math.max(1, Math.floor(rawLimit))) : 100;
    const rows = await db.query<{ record_json: string }>(
      `SELECT record_json FROM student_activities WHERE student_user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [req.authUser!.id, maxCount]
    );
    const activities = rows
      .map((r) => safeJsonParse<Record<string, unknown> | null>(r.record_json, null))
      .filter(Boolean);
    res.json({ activities });
  });

  router.post('/progress/me/activities', async (req, res) => {
    const parsed = postActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_ACTIVITY', details: parsed.error.flatten() });
      return;
    }

    const uid = req.authUser!.id;
    const { activity, summary, isComplete } = parsed.data;
    const now = Date.now();
    const scopedActivity = {
      ...activity,
      studentUid: uid,
      studentEmail: req.authUser!.internalEmail,
    };
    const scopedSummary = {
      ...summary,
      studentUid: uid,
      studentEmail: req.authUser!.internalEmail,
    };

    const outcome = await db.transaction(async (tx) => {
      const existing = await tx.queryOne<{ id: string; is_complete: number; updated_at: number }>(
        `SELECT id, is_complete, updated_at FROM student_activities WHERE id = $1 AND student_user_id = $2`,
        [activity.id, uid]
      );

      if (existing && Number(existing.is_complete) === 1) {
        return { skipped: true, id: existing.id };
      }

      if (existing) {
        await tx.execute(
          `UPDATE student_activities
           SET type = $1, subject_id = $2, grade = $3, score = $4, max_score = $5,
               accuracy_pct = $6, is_complete = $7, record_json = $8, updated_at = $9
           WHERE id = $10 AND student_user_id = $11`,
          [
            activity.type,
            activity.subjectId,
            activity.grade,
            activity.score,
            activity.maxScore,
            activity.accuracyPct,
            isComplete ? 1 : 0,
            JSON.stringify(scopedActivity),
            now,
            activity.id,
            uid,
          ]
        );
      } else {
        await tx.execute(
          `INSERT INTO student_activities (
            id, student_user_id, type, subject_id, grade, score, max_score,
            accuracy_pct, is_complete, record_json, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            activity.id,
            uid,
            activity.type,
            activity.subjectId,
            activity.grade,
            activity.score,
            activity.maxScore,
            activity.accuracyPct,
            isComplete ? 1 : 0,
            JSON.stringify(scopedActivity),
            activity.createdAt,
            now,
          ]
        );
      }

      await tx.execute(
        `INSERT INTO student_progress (student_user_id, summary_json, updated_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (student_user_id) DO UPDATE SET summary_json = EXCLUDED.summary_json, updated_at = EXCLUDED.updated_at`,
        [uid, JSON.stringify(scopedSummary), now]
      );

      return { skipped: false, id: activity.id };
    });

    if (!outcome.skipped && isComplete) {
      void notifyParentsOnActivityComplete({
        db,
        config,
        wechatService,
        studentUid: uid,
        studentName: req.authUser!.displayName || '同学',
        subjectTitle: activity.title,
        scoreSummary: `${activity.score}/${activity.maxScore}（${activity.accuracyPct}%）`,
      });
    }

    res.json({ id: outcome.id, skipped: outcome.skipped });
  });

  const feedbackSchema = z.object({
    aiFeedback: z.string().min(1).max(3000),
  });

  router.patch('/progress/me/activities/:activityId/feedback', async (req, res) => {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_FEEDBACK' });
      return;
    }
    const uid = req.authUser!.id;
    const activityId = (req.params.activityId || '').trim();
    const row = await db.queryOne<{ record_json: string }>(
      `SELECT record_json FROM student_activities WHERE id = $1 AND student_user_id = $2`,
      [activityId, uid]
    );
    if (!row) {
      res.status(404).json({ error: 'ACTIVITY_NOT_FOUND' });
      return;
    }
    const current = safeJsonParse<Record<string, unknown>>(row.record_json, {});
    const now = Date.now();
    current.aiFeedback = parsed.data.aiFeedback.trim().slice(0, 3000);
    current.updatedAt = now;
    await db.execute(
      `UPDATE student_activities SET record_json = $1, updated_at = $2 WHERE id = $3 AND student_user_id = $4`,
      [JSON.stringify(current), now, activityId, uid]
    );
    res.json({ ok: true });
  });

  router.get('/parent/students/:studentUid/progress', async (req, res) => {
    const parentUid = req.authUser!.id;
    const studentUid = (req.params.studentUid || '').trim();
    const link = await db.queryOne<{ id: string }>(
      `SELECT id FROM guardian_links WHERE parent_user_id = $1 AND student_user_id = $2`,
      [parentUid, studentUid]
    );

    if (!link) {
      res.status(403).json({ error: 'FORBIDDEN', message: '未授权访问该学生档案' });
      return;
    }

    const summaryRow = await db.queryOne<{ summary_json: string }>(
      `SELECT summary_json FROM student_progress WHERE student_user_id = $1`,
      [studentUid]
    );
    const activityRows = await db.query<{ record_json: string }>(
      `SELECT record_json FROM student_activities WHERE student_user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [studentUid]
    );

    const summary = safeJsonParse(summaryRow?.summary_json, null);
    const activities = activityRows
      .map((r) => safeJsonParse<Record<string, unknown> | null>(r.record_json, null))
      .filter(Boolean);

    res.json({ summary, activities });
  });

  return router;
}
