import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../src/server/app';
import { SafeguardClient } from '../src/sdk/client';

describe('Policy Rules & Batch Rules API Tests', () => {
  it('GET /api/policy/rules returns canonical rules with correct precedence ordering', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as { port: number }).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/policy/rules`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.ruleCount, 6);
      assert.equal(body.data[0].category, 'SANCTIONS');
      assert.equal(body.data[0].precedence, 1);
      assert.equal(body.data[5].category, 'ALLOWLIST');
      assert.equal(body.data[5].precedence, 6);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('POST /api/policy/batch-rules returns rule configurations for multiple policy IDs', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as { port: number }).port;

    try {
      const payload = {
        policyIds: ['POL-GLOBAL-MAIN', 'POL-PAYROLL-V2', 'POL-TREASURY'],
      };

      const res = await fetch(`http://127.0.0.1:${port}/api/policy/batch-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.totalPolicies, 3);
      assert.equal(body.results.length, 3);
      assert.equal(body.results[0].policyId, 'POL-GLOBAL-MAIN');
      assert.equal(body.results[0].ruleCount, 6);

      // Rejects invalid payload
      const badRes = await fetch(`http://127.0.0.1:${port}/api/policy/batch-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyIds: [] }),
      });
      assert.equal(badRes.status, 400);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
