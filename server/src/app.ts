import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import type { ServerConfig } from './config.js';
import type { DbClient } from './db/database.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { createAiRouter } from './routes/ai.js';
import { createAuthRouter } from './routes/auth.js';
import { createGuardianRouter } from './routes/guardian.js';
import { createProgressRouter } from './routes/progress.js';
import { createUserRouter } from './routes/user.js';
import { createWeChatWebhookRouter } from './routes/wechatWebhook.js';
import { QwenService, type OpenAICompatClient } from './services/qwenService.js';
import { WeChatService, type FetchLike } from './services/wechatService.js';

export interface AppDependencies {
  db: DbClient;
  config: ServerConfig;
  wechatFetch?: FetchLike;
  qwenClient?: OpenAICompatClient;
}

export function createApp(deps: AppDependencies): Express {
  const { db, config } = deps;
  const app = express();
  app.set('trust proxy', 1);

  const wechatService = new WeChatService(config, deps.wechatFetch);
  const qwenService = new QwenService(db, config, deps.qwenClient);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('CORS_NOT_ALLOWED'));
      },
      credentials: true,
    })
  );

  // Mount raw XML text parser BEFORE express.json() strictly for WeChat webhook
  app.use(
    '/api/wechat/webhook',
    express.text({ type: ['text/xml', 'application/xml', 'text/plain'], limit: '256kb' }),
    createWeChatWebhookRouter({ db, config, wechatService })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(createAuthMiddleware(db, config));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      region: 'cn',
      dbDialect: db.dialect,
      wechatConfigured: wechatService.isConfigured(),
      devAuthEnabled: config.enableDevAuth,
    });
  });

  app.use('/api/auth', createAuthRouter({ db, config, wechatService }));
  app.use('/api/user', createUserRouter(db));
  app.use('/api/guardian', createGuardianRouter(db));
  app.use('/api', createProgressRouter({ db, config, wechatService }));
  app.use('/api/ai', createAiRouter(qwenService));

  return app;
}
