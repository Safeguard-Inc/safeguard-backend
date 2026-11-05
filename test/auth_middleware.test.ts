import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { signSessionToken, verifySessionToken, createAuthMiddleware } from '../src/server/middleware/auth.ts';
import { createRouter } from '../src/server/routes.ts';
import { SafeguardClient } from '../src/sdk/client.ts';
import type { Server } from 'http';

describe('Authentication Middleware & Session Token Security Tests', () => {
  const testSecret = 'test-secret-salt-32-chars-long-secure';
  const testAddress = 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4';

  test('signs and verifies a valid cryptographic session token', () => {
    const token = signSessionToken(testAddress, testSecret, 3600);
    assert.ok(token);
    assert.equal(token.split('.').length, 3);

    const verified = verifySessionToken(token, testSecret);
    assert.equal(verified.valid, true);
    assert.equal(verified.address, testAddress);
  });

  test('rejects tampered or forged tokens with invalid signature', () => {
    const token = signSessionToken(testAddress, testSecret, 3600);
    const parts = token.split('.');
    // Tamper with payload
    const tamperedToken = `${parts[0]}.${parts[1]}tampered.${parts[2]}`;

    const verified = verifySessionToken(tamperedToken, testSecret);
    assert.equal(verified.valid, false);
  });

  test('rejects tokens signed with a different secret', () => {
    const token = signSessionToken(testAddress, 'attacker-secret', 3600);
    const verified = verifySessionToken(token, testSecret);
    assert.equal(verified.valid, false);
    assert.ok(verified.error?.includes('Invalid cryptographic signature'));
  });

  test('enforces authentication on protected mutations when requireAuth is enabled', async () => {
    const prevAuth = process.env.REQUIRE_AUTH;
    process.env.REQUIRE_AUTH = 'true';

    const client = new SafeguardClient();
    const app = express();
    app.use(express.json());
    app.use(createRouter(client));

    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    try {
      const port = (server.address() as any).port;
      const USDC = 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75';

      // 1. Unauthenticated request to protected spend cap mutation is rejected with 401
      const resUnauth = await fetch(`http://127.0.0.1:${port}/api/tokens/spend-caps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: USDC, cap: '5000' }),
      });
      assert.equal(resUnauth.status, 401);
      const jsonUnauth = (await resUnauth.json()) as any;
      assert.equal(jsonUnauth.success, false);

      // 2. Authenticated request with signed token succeeds with 200
      const validToken = signSessionToken(testAddress);
      const resAuth = await fetch(`http://127.0.0.1:${port}/api/tokens/spend-caps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({ token: USDC, cap: '5000' }),
      });
      assert.equal(resAuth.status, 200);
      const jsonAuth = (await resAuth.json()) as any;
      assert.equal(jsonAuth.success, true);
    } finally {
      process.env.REQUIRE_AUTH = prevAuth;
      server.close();
    }
  });
});
