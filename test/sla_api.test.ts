import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../src/server/app';
import { SafeguardClient } from '../src/sdk/client';
import { defaultLedgerMonitor } from '../src/server/ledgerMonitor';

describe('Enterprise SLA API & Health Tests', () => {
  it('returns SLA compliance metrics and healthy status when synced', async () => {
    // Reset monitor to healthy state
    defaultLedgerMonitor.updateLedgers(100_000, 100_000);

    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health/sla`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.service, 'safeguard-backend');
      assert.equal(body.sla.status, 'MET');
      assert.equal(body.sla.target, '99.90%');
      assert.equal(body.ledgerLag.lagLedgers, 0);
      assert.equal(body.ledgerLag.syncGrade, 'synced');
      assert.equal(body.ledgerLag.isSlaCompliant, true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('reflects degraded SLA status when ledger monitor detects severe lag', async () => {
    // Simulate severe desync (lag of 20 ledgers)
    defaultLedgerMonitor.updateLedgers(100_020, 100_000);

    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health/sla`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.sla.status, 'BREACHED');
      assert.equal(body.ledgerLag.lagLedgers, 20);
      assert.equal(body.ledgerLag.estimatedLagSeconds, 100);
      assert.equal(body.ledgerLag.syncGrade, 'desynced');
      assert.equal(body.ledgerLag.isSlaCompliant, false);
    } finally {
      // Restore monitor state
      defaultLedgerMonitor.updateLedgers(100_000, 100_000);
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
