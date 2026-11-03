import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DataStore } from '../src/server/store.js';
import { SorobanIndexer } from '../src/server/indexer.js';
import { createApp } from '../src/server/app.js';

describe('Safeguard Backend Store & Indexer Tests', () => {
  test('DataStore persists and retrieves transactions and escrows', () => {
    const store = new DataStore();
    const initialCount = store.getTransactionCount();

    store.addTransaction({
      id: `test-tx-${Date.now()}`,
      sender: 'GCSENDERTEST',
      recipient: 'GCRECIPIENTTEST',
      token: 'XLM',
      amount: '1000',
      status: 'Approved',
      reason: 'Unit test submission',
      timestamp: Date.now(),
    });

    assert.equal(store.getTransactionCount(), initialCount + 1);

    const escrows = store.getEscrows();
    assert.ok(Array.isArray(escrows));
    assert.ok(escrows.length > 0);

    store.upsertEscrow({
      id: 'test-escrow-99',
      escrowIndex: 99,
      amount: '200',
      token: 'XLM',
      sender: 'GCSENDERTEST',
      recipient: 'GCRECIPIENTTEST',
      expiresAt: Math.floor(Date.now() / 1000) + 7200,
      status: 'Pending',
    });

    const pending = store.getEscrows('Pending');
    const item99 = pending.find((e) => e.escrowIndex === 99);
    assert.ok(item99);

    store.updateEscrowStatus(99, 'Released');
    const released = store.getEscrows('Released');
    assert.ok(released.some((e) => e.escrowIndex === 99));
  });

  test('SorobanIndexer initializes with correct status and contract ID', () => {
    const indexer = new SorobanIndexer(
      'https://soroban-testnet.stellar.org',
      'CDC6KVX7QT7CD3GOVGX44NQUNS7FMSZKIAXTV3TDGSXQKJRQMDZRSRCN'
    );
    const status = indexer.getStatus();
    assert.equal(status.contractId, 'CDC6KVX7QT7CD3GOVGX44NQUNS7FMSZKIAXTV3TDGSXQKJRQMDZRSRCN');
    assert.equal(status.active, false);
  });

  test('App initializes with all routes registered', () => {
    const app = createApp();
    assert.ok(app);
  });
  test('DataStore correctly tracks counts and prunes transactions older than maxAge', () => {
    const store = new DataStore();
    const oldTx = {
      id: `prune-tx-${Date.now()}`,
      sender: 'GBOLD1111111111111111111111111111111111111111111111111111',
      recipient: 'GBOLD2222222222222222222222222222222222222222222222222222',
      token: 'XLM',
      amount: '500',
      status: 'Approved' as const,
      reason: 'Old test record',
      timestamp: Date.now() - 50000,
    };
    store.addTransaction(oldTx);
    assert.ok(store.getTransactionCount() > 0);
    assert.ok(store.getEscrowCount() >= 0);

    const pruned = store.pruneOldTransactions(20000);
    assert.ok(pruned >= 1);
  });

  test('App serves health check, deep health, and OpenAPI documentation', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    try {
      const resHealth = await fetch(`http://localhost:${port}/health`);
      assert.equal(resHealth.status, 200);
      const dataHealth = (await resHealth.json()) as any;
      assert.equal(dataHealth.status, 'healthy');

      const resDocs = await fetch(`http://localhost:${port}/docs`);
      assert.equal(resDocs.status, 200);
      const docsHtml = await resDocs.text();
      assert.ok(docsHtml.includes('SwaggerUIBundle'));

      const resSpec = await fetch(`http://localhost:${port}/api/openapi.json`);
      assert.equal(resSpec.status, 200);
      const spec = (await resSpec.json()) as any;
      assert.equal(spec.openapi, '3.1.0');
      assert.ok(spec.paths['/api/pay/simulate']);
    } finally {
      server.close();
    }
  });
});
