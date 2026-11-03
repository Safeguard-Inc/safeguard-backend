import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createRouter } from '../src/server/routes.ts';
import { SafeguardClient } from '../src/sdk/client.ts';
import type { Server } from 'http';

describe('Token Spend Caps Management API Tests', () => {
  const USDC = 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75';

  test('configures, queries, and removes token-specific spend caps over HTTP', async () => {
    const client = new SafeguardClient();
    const app = express();
    app.use(express.json());
    app.use(createRouter(client));

    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    try {
      const port = (server.address() as any).port;

      // 1. Initial query: default spend cap present
      const res1 = await fetch(`http://127.0.0.1:${port}/api/tokens/spend-caps`);
      assert.equal(res1.status, 200);
      const json1: any = await res1.json();
      assert.equal(json1.success, true);
      assert.equal(json1.data.defaultSpendCap, '1000000000');
      assert.equal(Object.keys(json1.data.tokenSpendCaps).length, 0);

      // 2. Set token spend cap for USDC
      const res2 = await fetch(`http://127.0.0.1:${port}/api/tokens/spend-caps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: USDC,
          cap: '5000000000', // 500 units
        }),
      });
      assert.equal(res2.status, 200);
      const json2: any = await res2.json();
      assert.equal(json2.success, true);
      assert.equal(json2.action, 'set');
      assert.equal(json2.cap, '5000000000');

      // 3. Verify in query
      const res3 = await fetch(`http://127.0.0.1:${port}/api/tokens/spend-caps`);
      const json3: any = await res3.json();
      assert.equal(json3.data.tokenSpendCaps[USDC], '5000000000');

      // 4. Remove token spend cap
      const res4 = await fetch(`http://127.0.0.1:${port}/api/tokens/spend-caps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: USDC,
          action: 'remove',
        }),
      });
      assert.equal(res4.status, 200);
      const json4: any = await res4.json();
      assert.equal(json4.success, true);
      assert.equal(json4.action, 'remove');
      assert.equal(json4.removed, true);

      // 5. Verify removal
      const res5 = await fetch(`http://127.0.0.1:${port}/api/tokens/spend-caps`);
      const json5: any = await res5.json();
      assert.equal(json5.data.tokenSpendCaps[USDC], undefined);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('rejects missing token or missing cap with HTTP 400', async () => {
    const client = new SafeguardClient();
    const app = express();
    app.use(express.json());
    app.use(createRouter(client));

    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    try {
      const port = (server.address() as any).port;

      const noTokenRes = await fetch(`http://127.0.0.1:${port}/api/tokens/spend-caps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cap: '1000' }),
      });
      assert.equal(noTokenRes.status, 400);

      const noCapRes = await fetch(`http://127.0.0.1:${port}/api/tokens/spend-caps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: USDC }),
      });
      assert.equal(noCapRes.status, 400);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
