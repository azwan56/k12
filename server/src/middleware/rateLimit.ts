import type { NextFunction, Request, Response } from 'express';

interface Bucket {
  timestamps: number[];
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  keyFn?: (req: Request) => string;
}) {
  const buckets = new Map<string, Bucket>();
  const { windowMs, max } = options;
  const keyFn = options.keyFn ?? ((req: Request) => req.authUser?.id || req.ip || 'anon');

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = keyFn(req);
    const cutoff = now - windowMs;
    const bucket = buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

    if (bucket.timestamps.length >= max) {
      res.status(429).json({
        error: 'RATE_LIMITED',
        message: '请求过于频繁，请稍后再试',
      });
      return;
    }

    bucket.timestamps.push(now);
    buckets.set(key, bucket);

    if (buckets.size > 5000) {
      for (const [k, b] of buckets.entries()) {
        if (b.timestamps.every((t) => t <= cutoff)) {
          buckets.delete(k);
        }
      }
    }

    next();
  };
}
