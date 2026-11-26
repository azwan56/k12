import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  appOrigin: string;
  allowedOrigins: string[];
  databaseUrl: string;
  sqlitePath: string;
  jwtSecret: string;
  sessionCookieName: string;
  sessionTtlDays: number;
  dashscopeApiKey: string;
  dashscopeBaseUrl: string;
  qwenModelPractice: string;
  qwenModelMathChallenge: string;
  qwenModelFast: string;
  wechatAppId: string;
  wechatAppSecret: string;
  wechatWebhookToken: string;
  wechatTemplateIdReport: string;
  wechatOAuthEnabled: boolean;
  enableDevAuth: boolean;
}

export function loadConfig(overrides?: Partial<ServerConfig>): ServerConfig {
  const nodeEnv = overrides?.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  const rawJwtSecret = overrides?.jwtSecret ?? process.env.JWT_SECRET ?? '';
  if (isProduction && rawJwtSecret.trim().length < 24) {
    throw new Error('JWT_SECRET must be at least 24 characters in production');
  }
  const jwtSecret = rawJwtSecret.trim() || 'dev-only-insecure-k12-cn-jwt-secret-change-me';

  const appOrigin = (overrides?.appOrigin ?? process.env.APP_ORIGIN ?? 'http://localhost:3000').replace(/\/+$/, '');
  const rawCors = process.env.CORS_ORIGINS ?? '';
  const allowedOrigins = overrides?.allowedOrigins ?? Array.from(
    new Set(
      [appOrigin, ...rawCors.split(',').map((s) => s.trim()).filter(Boolean)]
    )
  );

  const rawDevAuth = overrides?.enableDevAuth ?? (process.env.ENABLE_DEV_AUTH === 'true');
  const enableDevAuth = isProduction ? false : Boolean(rawDevAuth);

  const wechatAppId = overrides?.wechatAppId ?? process.env.WECHAT_APP_ID ?? '';
  const wechatAppSecret = overrides?.wechatAppSecret ?? process.env.WECHAT_APP_SECRET ?? '';
  const wechatOAuthEnabled =
    overrides?.wechatOAuthEnabled ??
    (process.env.WECHAT_OAUTH_ENABLED === 'false'
      ? false
      : Boolean(wechatAppId && wechatAppSecret));

  return {
    port: overrides?.port ?? Number(process.env.PORT || 8787),
    nodeEnv,
    isProduction,
    appOrigin,
    allowedOrigins,
    databaseUrl: overrides?.databaseUrl ?? process.env.DATABASE_URL ?? '',
    sqlitePath: overrides?.sqlitePath ?? process.env.SQLITE_PATH ?? path.resolve(process.cwd(), 'data', 'k12_cn.db'),
    jwtSecret,
    sessionCookieName: overrides?.sessionCookieName ?? 'k12_cn_session',
    sessionTtlDays: overrides?.sessionTtlDays ?? 14,
    dashscopeApiKey: overrides?.dashscopeApiKey ?? process.env.DASHSCOPE_API_KEY ?? '',
    dashscopeBaseUrl:
      (overrides?.dashscopeBaseUrl ?? process.env.DASHSCOPE_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, ''),
    qwenModelPractice: overrides?.qwenModelPractice ?? process.env.QWEN_MODEL_PRACTICE ?? 'qwen-plus',
    qwenModelMathChallenge: overrides?.qwenModelMathChallenge ?? process.env.QWEN_MODEL_MATH_CHALLENGE ?? 'qwen-max',
    qwenModelFast: overrides?.qwenModelFast ?? process.env.QWEN_MODEL_FAST ?? 'qwen-flash',
    wechatAppId,
    wechatAppSecret,
    wechatWebhookToken: overrides?.wechatWebhookToken ?? process.env.WECHAT_WEBHOOK_TOKEN ?? '',
    wechatTemplateIdReport: overrides?.wechatTemplateIdReport ?? process.env.WECHAT_TEMPLATE_ID_REPORT ?? '',
    wechatOAuthEnabled,
    enableDevAuth,
  };
}
