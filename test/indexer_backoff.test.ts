import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SorobanIndexer } from '../src/server/indexer.js';

describe('SorobanIndexer Backoff & Resiliency Tests', () => {
  test('calculates exponential backoff delay correctly across error counts', () => {
    const indexer = new SorobanIndexer(
      'https://soroban-testnet.stellar.org',
      'CDC6KVX7QT7CD3GOVGX44NQUNS7FMSZKIAXTV3TDGSXQKJRQMDZRSRCN'
    );

    // 0 errors -> default poll interval (15s)
    assert.equal(indexer.getBackoffDelay(0), 15000);

    // 1 error -> base retry delay (2s)
    assert.equal(indexer.getBackoffDelay(1), 2000);

    // 2 errors -> 4s
    assert.equal(indexer.getBackoffDelay(2), 4000);

    // 3 errors -> 8s
    assert.equal(indexer.getBackoffDelay(3), 8000);

    // 4 errors -> 16s
    assert.equal(indexer.getBackoffDelay(4), 16000);

    // 5 errors -> 32s
    assert.equal(indexer.getBackoffDelay(5), 32000);

    // 6 errors -> capped at maxRetryMs (60s)
    assert.equal(indexer.getBackoffDelay(6), 60000);
    assert.equal(indexer.getBackoffDelay(10), 60000);
  });

  test('getStatus exposes consecutiveErrors and currentIntervalMs', () => {
    const indexer = new SorobanIndexer();
    const status = indexer.getStatus();

    assert.equal(status.consecutiveErrors, 0);
    assert.equal(status.currentIntervalMs, 15000);
    assert.equal(status.healthy, true);
  });

  test('syncEvents catches network errors, increments error counter, and marks unhealthy', async () => {
    // Point indexer to an unresolvable domain to simulate network outage
    const indexer = new SorobanIndexer('https://non-existent-soroban-rpc-stellar-12345.org');

    const count = await indexer.syncEvents();
    assert.equal(count, 0);

    const status = indexer.getStatus();
    assert.equal(status.healthy, false);
    assert.equal(status.consecutiveErrors, 1);
    assert.equal(status.currentIntervalMs, 2000);

    // Second failure doubles backoff
    await indexer.syncEvents();
    const status2 = indexer.getStatus();
    assert.equal(status2.consecutiveErrors, 2);
    assert.equal(status2.currentIntervalMs, 4000);
  });
});
