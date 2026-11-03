import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GatewayTelemetryAggregator,
  type OnChainTelemetryInput,
  type BackendStoreTelemetryInput,
} from '../src/sdk/gatewayTelemetry.js';

describe('GatewayTelemetryAggregator Unit Tests', () => {
  it('evaluates matching counters as IN_SYNC and synchronized', () => {
    const onChain: OnChainTelemetryInput = {
      currentSequence: 25,
      totalEscrows: 8,
      totalVolumeStroops: '5000000000',
      activeSpendCapStroops: '1000000000',
      isPaused: false,
    };

    const backend: BackendStoreTelemetryInput = {
      indexedTransactionsCount: 25,
      indexedEscrowsCount: 8,
      syncedLedgerSequence: 123456,
      ledgerLagSeconds: 2,
    };

    const rec = GatewayTelemetryAggregator.reconcile(onChain, backend);

    assert.equal(rec.synchronized, true);
    assert.equal(rec.status, 'IN_SYNC');
    assert.equal(rec.sequenceDiscrepancy, 0);
    assert.equal(rec.escrowDiscrepancy, 0);
    assert.equal(rec.diagnostics.length, 0);
  });

  it('detects minor discrepancy as INDEXING_LAG', () => {
    const onChain: OnChainTelemetryInput = {
      currentSequence: 30,
      totalEscrows: 10,
      totalVolumeStroops: '6000000000',
      activeSpendCapStroops: '1000000000',
      isPaused: false,
    };

    const backend: BackendStoreTelemetryInput = {
      indexedTransactionsCount: 28, // 2 behind
      indexedEscrowsCount: 9, // 1 behind
      syncedLedgerSequence: 123450,
      ledgerLagSeconds: 15, // > 10s
    };

    const rec = GatewayTelemetryAggregator.reconcile(onChain, backend);

    assert.equal(rec.synchronized, false);
    assert.equal(rec.status, 'INDEXING_LAG');
    assert.equal(rec.sequenceDiscrepancy, 2);
    assert.equal(rec.escrowDiscrepancy, 1);
    assert.ok(rec.diagnostics.some((d) => d.includes('Missing 1 unindexed escrows')));
  });

  it('flags severe divergence as DESYNCHRONIZED', () => {
    const onChain: OnChainTelemetryInput = {
      currentSequence: 100,
      totalEscrows: 40,
      totalVolumeStroops: '50000000000',
      activeSpendCapStroops: '1000000000',
      isPaused: true,
    };

    const backend: BackendStoreTelemetryInput = {
      indexedTransactionsCount: 80, // 20 behind (>5)
      indexedEscrowsCount: 30, // 10 behind (>5)
      syncedLedgerSequence: 120000,
      ledgerLagSeconds: 45,
    };

    const rec = GatewayTelemetryAggregator.reconcile(onChain, backend);

    assert.equal(rec.synchronized, false);
    assert.equal(rec.status, 'DESYNCHRONIZED');
    assert.ok(rec.diagnostics.some((d) => d.includes('circuit breaker')));
    assert.ok(rec.diagnostics.some((d) => d.includes('lagging behind Horizon')));
  });
});
