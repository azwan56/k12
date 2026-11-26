import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { ServerConfig } from '../config.js';
import type { DbClient } from '../db/database.js';

export interface SessionClaims {
  sub: string;
  provider: 'wechat' | 'phone' | 'dev';
}

export interface AuthenticatedUser {
  id: string;
  internalEmail: string;
  displayName: string;
  avatarId: string;
  photoURL: string | null;
  grade: 'G6' | 'G7';
  provider: 'wechat' | 'phone' | 'dev';
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser | null;
    }
  }
}

export function signSessionToken(claims: SessionClaims, config: ServerConfig): string {
  return jwt.sign(claims, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: `${config.sessionTtlDays}d`,
  });
}

export function setSessionCookie(res: Response, token: string, config: ServerConfig): void {
  res.cookie(config.sessionCookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: config.sessionTtlDays * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response, config: ServerConfig): void {
  res.clearCookie(config.sessionCookieName, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

export function createAuthMiddleware(db: DbClient, config: ServerConfig) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const cookieToken = req.cookies?.[config.sessionCookieName];
      const authHeader = req.headers.authorization;
      const bearerToken =
        typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice(7).trim()
          : '';
      const token = cookieToken || bearerToken;

      if (!token) {
        req.authUser = null;
        return next();
      }

      const decoded = jwt.verify(token, config.jwtSecret) as SessionClaims;
      if (!decoded?.sub) {
        req.authUser = null;
        return next();
      }

      const row = await db.queryOne<{
        id: string;
        internal_email: string;
        display_name: string;
        avatar_id: string;
        photo_url: string | null;
        grade: string;
        provider: string;
      }>(
        `SELECT id, internal_email, display_name, avatar_id, photo_url, grade, provider
         FROM users WHERE id = $1`,
        [decoded.sub]
      );

      if (!row) {
        req.authUser = null;
        return next();
      }

      req.authUser = {
        id: row.id,
        internalEmail: row.internal_email,
        displayName: row.display_name,
        avatarId: row.avatar_id || 'owl',
        photoURL: row.photo_url ?? null,
        grade: row.grade === 'G7' ? 'G7' : 'G6',
        provider: row.provider === 'dev' ? 'dev' : row.provider === 'phone' ? 'phone' : 'wechat',
      };
      next();
    } catch {
      req.authUser = null;
      next();
    }
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'UNAUTHENTICATED', message: '请先登录' });
    return;
  }
  next();
}
