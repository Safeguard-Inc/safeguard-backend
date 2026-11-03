import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createRouter } from '../src/server/routes.ts';
import { SafeguardClient } from '../src/sdk/client.ts';
import { defaultRateLimiter } from '../src/server/middleware/rateLimit.ts';
import type { Server } from 'http';

describe('System Rate Limits Inspection API Tests', () => {
  test('GET /api/system/limits returns current rate limit bucket metrics', async () => {
    defaultRateLimiter.reset();
    const app = express();
    app.use(defaultRateLimiter);
    app.use(createRouter(new SafeguardClient()));

    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    try {
      const port = (server.address() as any).port;
      const res = await fetch(`http://127.0.0.1:${port}/api/system/limits`);
      assert.equal(res.status, 200);

      const json: any = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data);
      assert.equal(json.data.limit, 60);
      assert.equal(typeof json.data.remaining, 'number');
      assert.equal(typeof json.data.refillRatePerSec, 'number');
      assert.equal(typeof json.data.resetSeconds, 'number');
      assert.ok(json.data.remaining <= 60);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
