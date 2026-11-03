import { Request, Response, NextFunction } from 'express';

export type ApiTier = 'public' | 'standard' | 'enterprise';

export interface TierConfig {
  maxTokens: number;
  refillRatePerSec: number;
}

export const TIER_CONFIGS: Record<ApiTier, TierConfig> = {
  public: { maxTokens: 30, refillRatePerSec: 0.5 },
  standard: { maxTokens: 120, refillRatePerSec: 2 },
  enterprise: { maxTokens: 600, refillRatePerSec: 10 },
};

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  tier: ApiTier;
}

export class TieredRateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private skipPaths: string[];

  constructor(skipPaths: string[] = ['/health', '/health/deep', '/health/sla', '/api/health/sla']) {
    this.skipPaths = skipPaths;
  }

  /**
   * Determine client identity and tier from Authorization header or API Key.
   */
  public resolveClientTier(req: Request): { identifier: string; tier: ApiTier } {
    const authHeader = req.headers.authorization || '';
    const apiKey = (req.headers['x-api-key'] as string) || '';

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : apiKey.trim();

    if (token.startsWith('ent-') || token.startsWith('enterprise-') || token === 'enterprise') {
      return { identifier: `ent:${token}`, tier: 'enterprise' };
    }
    if (token.startsWith('std-') || token.startsWith('standard-') || token === 'standard') {
      return { identifier: `std:${token}`, tier: 'standard' };
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    return { identifier: `ip:${ip}`, tier: 'public' };
  }

  public getMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (this.skipPaths.some((p) => req.path === p || req.path.startsWith(p + '/'))) {
        return next();
      }

      const { identifier, tier } = this.resolveClientTier(req);
      const config = TIER_CONFIGS[tier];
      const now = Date.now();

      let bucket = this.buckets.get(identifier);
      if (!bucket) {
        bucket = { tokens: config.maxTokens, lastRefill: now, tier };
        this.buckets.set(identifier, bucket);
      } else {
        const elapsedSec = (now - bucket.lastRefill) / 1000;
        bucket.tokens = Math.min(config.maxTokens, bucket.tokens + elapsedSec * config.refillRatePerSec);
        bucket.lastRefill = now;
      }

      res.setHeader('X-RateLimit-Tier', tier);
      res.setHeader('X-RateLimit-Limit', config.maxTokens.toString());
      res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens).toString());

      if (bucket.tokens < 1) {
        const waitSec = Math.ceil((1 - bucket.tokens) / config.refillRatePerSec);
        res.setHeader('Retry-After', waitSec.toString());
        res.status(429).json({
          success: false,
          error: `Rate limit exceeded for tier: ${tier}`,
          tier,
          retryAfterSeconds: waitSec,
        });
        return;
      }

      bucket.tokens -= 1;
      next();
    };
  }

  public getBucket(identifier: string): TokenBucket | undefined {
    return this.buckets.get(identifier);
  }

  public reset(): void {
    this.buckets.clear();
  }
}

export const defaultTieredLimiter = new TieredRateLimiter();
