import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express, { Request, Response } from 'express';
import http from 'http';
import { TieredRateLimiter, TIER_CONFIGS } from '../src/server/rateLimitTiering';

describe('TieredRateLimiter Unit & HTTP Tests', () => {
  it('correctly resolves client tier and sets X-RateLimit headers', async () => {
    const limiter = new TieredRateLimiter();
    const app = express();
    app.use(limiter.getMiddleware());
    app.get('/test', (_req: Request, res: Response) => {
      res.json({ ok: true });
    });

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as { port: number }).port;

    try {
      // 1. Public client (no auth)
      const pubRes = await fetch(`http://127.0.0.1:${port}/test`);
      assert.equal(pubRes.status, 200);
      assert.equal(pubRes.headers.get('x-ratelimit-tier'), 'public');
      assert.equal(pubRes.headers.get('x-ratelimit-limit'), TIER_CONFIGS.public.maxTokens.toString());

      // 2. Standard tier with Bearer token
      const stdRes = await fetch(`http://127.0.0.1:${port}/test`, {
        headers: { Authorization: 'Bearer standard-secret-key-123' },
      });
      assert.equal(stdRes.status, 200);
      assert.equal(stdRes.headers.get('x-ratelimit-tier'), 'standard');
      assert.equal(stdRes.headers.get('x-ratelimit-limit'), TIER_CONFIGS.standard.maxTokens.toString());

      // 3. Enterprise tier with X-API-Key header
      const entRes = await fetch(`http://127.0.0.1:${port}/test`, {
        headers: { 'X-API-Key': 'ent-corp-key-999' },
      });
      assert.equal(entRes.status, 200);
      assert.equal(entRes.headers.get('x-ratelimit-tier'), 'enterprise');
      assert.equal(entRes.headers.get('x-ratelimit-limit'), TIER_CONFIGS.enterprise.maxTokens.toString());
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('enforces rate limit when token bucket is exhausted and returns HTTP 429 with Retry-After', async () => {
    const limiter = new TieredRateLimiter();
    const app = express();
    app.use(limiter.getMiddleware());
    app.get('/quota', (_req: Request, res: Response) => {
      res.json({ ok: true });
    });

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as { port: number }).port;

    try {
      // Manually set tokens to 0.5 (1 request remaining)
      const token = 'std-burst-user';
      const bucket = { tokens: 1.0, lastRefill: Date.now(), tier: 'standard' as const };
      (limiter as any).buckets.set(`std:${token}`, bucket);

      // First request consumes 0.5 -> drops below 0
      const r1 = await fetch(`http://127.0.0.1:${port}/quota`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(r1.status, 200);

      // Next request immediately rejected
      const r2 = await fetch(`http://127.0.0.1:${port}/quota`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(r2.status, 429);
      assert.equal(r2.headers.get('retry-after') !== null, true);

      const body = await r2.json();
      assert.equal(body.success, false);
      assert.match(body.error, /Rate limit exceeded/);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
