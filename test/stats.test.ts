import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DataStore, defaultStore } from '../src/server/store.js';
import { createApp } from '../src/server/app.js';

describe('Safeguard Compliance Stats Tests', () => {
  test('DataStore getComplianceStats calculates totals and ratios correctly', () => {
    const store = new DataStore();
    store.addTransaction({
      id: `stat-tx-app-${Date.now()}`,
      sender: 'GCSENDERTEST',
      recipient: 'GCRECIPIENTTEST',
      token: 'XLM',
      amount: '500000000', // 50 XLM
      status: 'Approved',
      reason: 'Approved test',
      timestamp: Date.now(),
    });

    store.addTransaction({
      id: `stat-tx-blk-${Date.now()}`,
      sender: 'GCSENDERTEST',
      recipient: 'GCRECIPIENTTEST',
      token: 'XLM',
      amount: '100000000', // 10 XLM
      status: 'Blocked',
      reason: 'Blocked test',
      timestamp: Date.now(),
    });

    const stats = store.getComplianceStats();
    assert.ok(stats.totalTransactions >= 2);
    assert.ok(stats.approvedCount >= 1);
    assert.ok(stats.blockedCount >= 1);
    assert.ok(typeof stats.approvalRatePercent === 'number');
    assert.ok(stats.approvalRatePercent >= 0 && stats.approvalRatePercent <= 100);
    assert.ok(BigInt(stats.totalVolumeStroops) >= 500000000n);
    assert.ok(stats.lastUpdated > 0);
  });

  test('GET /api/stats returns aggregate metrics payload', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/api/stats`);
      assert.equal(res.status, 200);
      const json = (await res.json()) as any;
      assert.equal(json.success, true);
      assert.ok(json.data);
      assert.ok(typeof json.data.totalTransactions === 'number');
      assert.ok(typeof json.data.approvedCount === 'number');
      assert.ok(typeof json.data.escrowedCount === 'number');
      assert.ok(typeof json.data.blockedCount === 'number');
      assert.ok(typeof json.data.approvalRatePercent === 'number');
      assert.ok(typeof json.data.totalEscrows === 'number');
      assert.ok(typeof json.data.pendingEscrows === 'number');
      assert.ok(typeof json.data.totalVolumeStroops === 'string');
    } finally {
      server.close();
    }
  });
});
