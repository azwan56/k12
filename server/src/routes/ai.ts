import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import type { QwenService } from '../services/qwenService.js';

const mathQuestionsSchema = z.object({
  language: z.enum(['en', 'zh']).default('en'),
  category: z.string().max(64).default('all'),
  difficulty: z.string().max(32).default('standard'),
  weakPoints: z.array(z.string().max(64)).max(10).default([]),
  recentQuestions: z.array(z.string().max(160)).max(24).default([]),
});

const mathFeedbackSchema = z.object({
  score: z.number(),
  answers: z.array(z.object({ questionId: z.string(), answer: z.string(), isCorrect: z.boolean() })).default([]),
  questions: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        correctAnswer: z.string(),
        category: z.string().optional(),
      })
    )
    .default([]),
  language: z.enum(['en', 'zh']).default('en'),
  category: z.string().max(64).default('all'),
  difficulty: z.string().max(32).default('standard'),
});

const wordsmithBatchSchema = z.object({
  words: z.array(z.string().min(1).max(40)).min(1).max(50),
});

const wordsmithEvalSchema = z.object({
  word: z.string().min(1).max(60),
  sentence: z.string().min(1).max(600),
});

const practiceSchema = z.object({
  subjectId: z.enum(['english', 'ig-math', 'shanghai-math', 'humanity', 'science']),
  grade: z.enum(['G6', 'G7']).default('G6'),
  difficulty: z.enum(['all', 'foundation', 'standard', 'challenge']).default('all'),
  trackId: z.string().max(64).optional(),
  trackName: z.string().max(120).optional(),
  topics: z.array(z.string().max(80)).max(8).default([]),
  count: z.number().int().min(1).max(8).default(5),
  recentStems: z.array(z.string().max(160)).max(24).default([]),
});

export function createAiRouter(qwenService: QwenService): Router {
  const router = Router();
  const aiLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 40 });

  router.use(aiLimiter);

  router.post('/math-questions', async (req, res) => {
    const parsed = mathQuestionsSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_PARAMS' });
      return;
    }
    try {
      const questions = await qwenService.generateMathQuestions(parsed.data);
      res.json({ questions });
    } catch (err) {
      console.error('[ai/math-questions] failed:', err);
      res.status(502).json({ error: 'AI_UPSTREAM_ERROR', message: '出题服务暂时繁忙，请稍后再试' });
    }
  });

  router.post('/math-feedback', async (req, res) => {
    const parsed = mathFeedbackSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_PARAMS' });
      return;
    }
    try {
      const feedback = await qwenService.getFinalFeedback(parsed.data);
      res.json({ feedback });
    } catch (err) {
      console.error('[ai/math-feedback] failed:', err);
      res.status(502).json({ error: 'AI_UPSTREAM_ERROR' });
    }
  });

  router.post('/wordsmith-batch', requireAuth, async (req, res) => {
    const parsed = wordsmithBatchSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_PARAMS' });
      return;
    }
    try {
      const data = await qwenService.generateWordsmithBatch(parsed.data.words);
      res.json({ data });
    } catch (err) {
      console.error('[ai/wordsmith-batch] failed:', err);
      res.status(502).json({ error: 'AI_UPSTREAM_ERROR' });
    }
  });

  router.post('/wordsmith-evaluate', requireAuth, async (req, res) => {
    const parsed = wordsmithEvalSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_PARAMS' });
      return;
    }
    try {
      const data = await qwenService.evaluateWordsmithSentence(parsed.data.word, parsed.data.sentence);
      res.json({ data });
    } catch (err) {
      console.error('[ai/wordsmith-evaluate] failed:', err);
      res.status(502).json({ error: 'AI_UPSTREAM_ERROR' });
    }
  });

  router.post('/practice-questions', requireAuth, async (req, res) => {
    const parsed = practiceSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_PARAMS' });
      return;
    }
    try {
      const questions = await qwenService.generatePracticeQuestions(parsed.data);
      res.json({ questions });
    } catch (err) {
      console.error('[ai/practice-questions] failed:', err);
      res.status(502).json({ error: 'AI_UPSTREAM_ERROR' });
    }
  });

  return router;
}
