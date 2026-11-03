import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LedgerSyncMonitor } from '../src/server/ledgerMonitor';

describe('LedgerSyncMonitor SLA Tests', () => {
  it('initializes with default zero lag and healthy grade', () => {
    const monitor = new LedgerSyncMonitor();
    const status = monitor.getStatus();

    assert.equal(status.lagLedgers, 0);
    assert.equal(status.estimatedLagSeconds, 0);
    assert.equal(status.grade, 'synced');
    assert.equal(status.isHealthy, true);
  });

  it('grades synchronization accurately based on ledger divergence', () => {
    const monitor = new LedgerSyncMonitor(5);

    // Minor lag: 1 ledger (approx 5s) -> synced
    monitor.updateLedgers(1001, 1000);
    let s = monitor.getStatus();
    assert.equal(s.lagLedgers, 1);
    assert.equal(s.estimatedLagSeconds, 5);
    assert.equal(s.grade, 'synced');
    assert.equal(s.isHealthy, true);

    // Moderate lag: 5 ledgers (approx 25s) -> degraded, but within 5-ledger SLA
    monitor.updateLedgers(1005, 1000);
    s = monitor.getStatus();
    assert.equal(s.lagLedgers, 5);
    assert.equal(s.estimatedLagSeconds, 25);
    assert.equal(s.grade, 'degraded');
    assert.equal(s.isHealthy, true);

    // Severe lag: 15 ledgers (approx 75s) -> desynced, breaches SLA
    monitor.updateLedgers(1015, 1000);
    s = monitor.getStatus();
    assert.equal(s.lagLedgers, 15);
    assert.equal(s.estimatedLagSeconds, 75);
    assert.equal(s.grade, 'desynced');
    assert.equal(s.isHealthy, false);
  });

  it('evaluates custom SLA threshold tolerances correctly', () => {
    const monitor = new LedgerSyncMonitor();
    monitor.updateLedgers(2000, 1996); // 4 ledgers lag

    assert.equal(monitor.isCompliantWithSla(5), true);
    assert.equal(monitor.isCompliantWithSla(3), false);
    assert.equal(monitor.isCompliantWithSla(4), true);
  });

  it('handles negative or inverted ledger values safely', () => {
    const monitor = new LedgerSyncMonitor();
    monitor.updateLedgers(1000, 1050); // indexer ahead of poll
    const s = monitor.getStatus();
    assert.equal(s.lagLedgers, 0);
    assert.equal(s.estimatedLagSeconds, 0);
    assert.equal(s.grade, 'synced');
  });
});
