import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DataStore, defaultStore } from '../src/server/store.js';
import { createApp } from '../src/server/app.js';

describe('Transaction & Escrow Pagination Tests', () => {
  test('DataStore getPaginatedTransactions respects limit, page, and status filters', () => {
    const store = new DataStore();
    store.addTransaction({
      id: `test-tx-approved-${Date.now()}`,
      sender: 'GCSENDERTEST',
      recipient: 'GCRECIPIENTTEST',
      token: 'XLM',
      amount: '100',
      status: 'Approved',
      reason: 'test approval',
      timestamp: Date.now(),
    });
    store.addTransaction({
      id: `test-tx-blocked-${Date.now()}`,
      sender: 'GCSENDERTEST',
      recipient: 'GCRECIPIENTTEST',
      token: 'XLM',
      amount: '100',
      status: 'Blocked',
      reason: 'test block',
      timestamp: Date.now(),
    });

    const page1 = store.getPaginatedTransactions({ page: 1, limit: 2 });
    assert.equal(page1.page, 1);
    assert.equal(page1.limit, 2);
    assert.equal(page1.items.length, 2);
    assert.ok(page1.total >= 2);
    assert.ok(page1.totalPages >= 1);

    const blockedOnly = store.getPaginatedTransactions({ status: 'Blocked' });
    assert.ok(blockedOnly.items.length >= 1);
    assert.ok(blockedOnly.items.every((tx) => tx.status === 'Blocked'));
  });

  test('DataStore getPaginatedEscrows handles status filtering and pagination metadata', () => {
    const store = new DataStore();
    store.upsertEscrow({
      id: `test-escrow-pending-${Date.now()}`,
      escrowIndex: 555,
      amount: '200',
      token: 'XLM',
      sender: 'GCSENDERTEST',
      recipient: 'GCRECIPIENTTEST',
      expiresAt: Math.floor(Date.now() / 1000) + 7200,
      status: 'Pending',
    });

    const result = store.getPaginatedEscrows({ page: 1, limit: 10 });
    assert.equal(result.page, 1);
    assert.ok(result.total >= 1);
    assert.ok(result.items.length >= 1);

    const pending = store.getPaginatedEscrows({ status: 'Pending' });
    assert.ok(pending.items.length >= 1);
    assert.ok(pending.items.every((e) => e.status === 'Pending'));
  });

  test('HTTP /api/transactions supports page, limit, and status query parameters', async () => {
    defaultStore.addTransaction({
      id: `http-test-blocked-${Date.now()}`,
      sender: 'GCSENDERTEST',
      recipient: 'GCRECIPIENTTEST',
      token: 'XLM',
      amount: '500',
      status: 'Blocked',
      reason: 'HTTP test blocked transaction',
      timestamp: Date.now(),
    });

    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/api/transactions?page=1&limit=2`);
      assert.equal(res.status, 200);
      const json = (await res.json()) as any;
      assert.equal(json.success, true);
      assert.equal(json.data.length, 2);
      assert.equal(json.pagination.page, 1);
      assert.equal(json.pagination.limit, 2);
      assert.ok(json.pagination.total >= 2);

      const resFiltered = await fetch(`http://localhost:${port}/api/transactions?status=Blocked`);
      assert.equal(resFiltered.status, 200);
      const jsonFiltered = (await resFiltered.json()) as any;
      assert.ok(jsonFiltered.data.length >= 1);
      assert.ok(jsonFiltered.data.every((tx: any) => tx.status === 'Blocked'));
    } finally {
      server.close();
    }
  });

  test('HTTP /api/escrows returns pagination envelope when params passed, and array without', async () => {
    defaultStore.upsertEscrow({
      id: `http-test-escrow-${Date.now()}`,
      escrowIndex: 777,
      amount: '300',
      token: 'XLM',
      sender: 'GCSENDERTEST',
      recipient: 'GCRECIPIENTTEST',
      expiresAt: Math.floor(Date.now() / 1000) + 7200,
      status: 'Pending',
    });

    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      // With pagination params
      const resPaginated = await fetch(`http://localhost:${port}/api/escrows?page=1&limit=1`);
      assert.equal(resPaginated.status, 200);
      const jsonPaginated = (await resPaginated.json()) as any;
      assert.equal(jsonPaginated.success, true);
      assert.ok(jsonPaginated.pagination);
      assert.equal(jsonPaginated.pagination.page, 1);
      assert.equal(jsonPaginated.pagination.limit, 1);
      assert.equal(jsonPaginated.data.length, 1);

      // Without params: backward compatible raw array
      const resRaw = await fetch(`http://localhost:${port}/api/escrows`);
      assert.equal(resRaw.status, 200);
      const jsonRaw = (await resRaw.json()) as any;
      assert.ok(Array.isArray(jsonRaw));
    } finally {
      server.close();
    }
  });
});
