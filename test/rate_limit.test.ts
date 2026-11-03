import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createRateLimiter } from '../src/server/middleware/rateLimit.js';

describe('API Rate Limiter Middleware Tests', () => {
  test('attaches RateLimit headers and decrements remaining tokens', async () => {
    const app = express();
    app.use(createRateLimiter({ maxTokens: 5, refillRatePerSec: 1 }));
    app.get('/test', (_req, res) => res.json({ ok: true }));

    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const res1 = await fetch(`http://localhost:${port}/test`);
      assert.equal(res1.status, 200);
      assert.equal(res1.headers.get('RateLimit-Limit'), '5');
      assert.equal(res1.headers.get('RateLimit-Remaining'), '4');
      assert.equal(res1.headers.get('X-RateLimit-Remaining'), '4');

      const res2 = await fetch(`http://localhost:${port}/test`);
      assert.equal(res2.status, 200);
      assert.equal(res2.headers.get('RateLimit-Remaining'), '3');
    } finally {
      server.close();
    }
  });

  test('blocks requests with HTTP 429 when rate limit is exhausted', async () => {
    const app = express();
    app.use(createRateLimiter({ maxTokens: 2, refillRatePerSec: 0.1 }));
    app.get('/test', (_req, res) => res.json({ ok: true }));

    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      await fetch(`http://localhost:${port}/test`); // 1st
      await fetch(`http://localhost:${port}/test`); // 2nd

      const resBlocked = await fetch(`http://localhost:${port}/test`); // 3rd (exceeds 2)
      assert.equal(resBlocked.status, 429);
      assert.ok(resBlocked.headers.get('Retry-After'));
      assert.equal(resBlocked.headers.get('RateLimit-Remaining'), '0');

      const body = (await resBlocked.json()) as any;
      assert.equal(body.success, false);
      assert.ok(body.error.includes('Too Many Requests'));
    } finally {
      server.close();
    }
  });

  test('bypasses rate limit for health check endpoints', async () => {
    const app = express();
    app.use(createRateLimiter({ maxTokens: 1, refillRatePerSec: 0.1 }));
    app.get('/health', (_req, res) => res.json({ status: 'healthy' }));

    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      // Multiple requests to /health should never be blocked even with maxTokens = 1
      const res1 = await fetch(`http://localhost:${port}/health`);
      assert.equal(res1.status, 200);

      const res2 = await fetch(`http://localhost:${port}/health`);
      assert.equal(res2.status, 200);

      const res3 = await fetch(`http://localhost:${port}/health`);
      assert.equal(res3.status, 200);
    } finally {
      server.close();
    }
  });
});
