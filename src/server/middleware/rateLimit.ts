import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  tokens: number;
  lastRefill: number;
}

export function createRateLimiter(options?: {
  maxTokens?: number;
  refillRatePerSec?: number;
}) {
  const maxTokens = options?.maxTokens || 60; // 60 requests
  const refillRate = options?.refillRatePerSec || 1; // 1 token per second
  const clientMap = new Map<string, RateLimitRecord>();

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Skip health checks from rate limiting
    if (req.path === '/health' || req.path === '/health/deep') {
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

    res.setHeader('X-RateLimit-Limit', maxTokens.toString());
    res.setHeader('X-RateLimit-Remaining', Math.floor(record.tokens).toString());

    if (record.tokens < 1) {
      res.setHeader('Retry-After', '1');
      res.status(429).json({
        success: false,
        error: 'Too Many Requests: Rate limit exceeded. Please back off and retry.',
      });
      return;
    }

    record.tokens -= 1;
    next();
  };
}
