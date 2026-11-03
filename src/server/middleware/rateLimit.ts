import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  tokens: number;
  lastRefill: number;
}

export interface RateLimitOptions {
  maxTokens?: number;
  refillRatePerSec?: number;
  skipPaths?: string[];
}

export function createRateLimiter(options?: RateLimitOptions) {
  const maxTokens = options?.maxTokens || 60; // 60 requests
  const refillRate = options?.refillRatePerSec || 1; // 1 token per second
  const skipPaths = options?.skipPaths || ['/health', '/health/deep'];
  const clientMap = new Map<string, RateLimitRecord>();

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (skipPaths.some((p) => req.path === p || req.path.startsWith(p + '/'))) {
      next();
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let record = clientMap.get(ip);

    if (!record) {
      record = { tokens: maxTokens, lastRefill: now };
      clientMap.set(ip, record);
    } else {
      const elapsedSec = (now - record.lastRefill) / 1000;
      record.tokens = Math.min(maxTokens, record.tokens + elapsedSec * refillRate);
      record.lastRefill = now;
    }

    if (record.tokens < 1) {
      const waitSeconds = Math.max(1, Math.ceil((1 - record.tokens) / refillRate));
      res.setHeader('Retry-After', waitSeconds.toString());
      res.setHeader('X-RateLimit-Limit', maxTokens.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('RateLimit-Limit', maxTokens.toString());
      res.setHeader('RateLimit-Remaining', '0');
      res.setHeader('RateLimit-Reset', waitSeconds.toString());
      res.status(429).json({
        success: false,
        error: `Too Many Requests: Rate limit exceeded. Please back off for ${waitSeconds} seconds.`,
      });
      return;
    }

    record.tokens -= 1;
    const remaining = Math.max(0, Math.floor(record.tokens));
    const resetSec = Math.ceil((maxTokens - record.tokens) / refillRate);

    res.setHeader('X-RateLimit-Limit', maxTokens.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('RateLimit-Limit', maxTokens.toString());
    res.setHeader('RateLimit-Remaining', remaining.toString());
    res.setHeader('RateLimit-Reset', resetSec.toString());

    next();
  };
}
