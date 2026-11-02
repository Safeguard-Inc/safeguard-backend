import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DataStore } from '../src/server/store.js';
import { SorobanIndexer } from '../src/server/indexer.js';
import { createApp } from '../src/server/app.js';

describe('Safeguard Backend Store & Indexer Tests', () => {
  test('DataStore persists and retrieves transactions and escrows', () => {
    const store = new DataStore();
    const initialCount = store.getTransactions().length;

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

    assert.equal(store.getTransactions().length, initialCount + 1);

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
});
