import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server/app.js';

describe('HTTP /api/network/fee Endpoint Tests', () => {
  test('returns default network fee recommendations and tiers', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/api/network/fee`);
      assert.equal(res.status, 200);

      const json = (await res.json()) as any;
      assert.equal(json.success, true);
      assert.equal(json.data.network, 'stellar-testnet');
      assert.equal(json.data.baseFeeStroops, 100);
      assert.ok(json.data.currentEstimate);
      assert.equal(json.data.currentEstimate.tier, 'normal');
      assert.ok(json.data.recommendedTiers.low);
      assert.ok(json.data.recommendedTiers.normal);
      assert.ok(json.data.recommendedTiers.priority);
    } finally {
      server.close();
    }
  });

  test('calculates custom amount and priority tier routing', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      // 200 XLM exceeds 100 XLM spend cap -> escrow fee calculation
      const res = await fetch(`http://localhost:${port}/api/network/fee?amount=2000000000&tier=priority`);
      assert.equal(res.status, 200);

      const json = (await res.json()) as any;
      assert.equal(json.success, true);
      assert.equal(json.data.currentEstimate.tier, 'priority');
      assert.equal(json.data.currentEstimate.isEscrow, true);
      assert.equal(json.data.currentEstimate.baseFeeStroops, 1000);
      assert.ok(json.data.currentEstimate.totalEstimatedFeeStroops > 700000);
    } finally {
      server.close();
    }
  });

  test('returns 400 on invalid non-numeric amount', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/api/network/fee?amount=not-a-number`);
      assert.equal(res.status, 400);

      const json = (await res.json()) as any;
      assert.equal(json.success, false);
      assert.ok(json.error);
    } finally {
      server.close();
    }
  });
});
