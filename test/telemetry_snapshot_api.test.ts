import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../src/server/app';
import { SafeguardClient } from '../src/sdk/client';

describe('Gateway Telemetry Snapshot API Endpoint Tests', () => {
  it('GET /api/telemetry/snapshot returns complete diagnostics and reconciliation state', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/telemetry/snapshot`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.reconciliation);
      assert.ok(json.onChain);
      assert.ok(json.backend);
      assert.ok(['IN_SYNC', 'INDEXING_LAG', 'DESYNCHRONIZED'].includes(json.reconciliation.status));
      assert.equal(typeof json.timestamp, 'number');
    } finally {
      server.close();
    }
  });

  it('GET /api/telemetry/snapshot reconciles custom overrides accurately', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/telemetry/snapshot?currentSequence=500&totalEscrows=200`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.onChain.currentSequence, 500);
      assert.equal(json.onChain.totalEscrows, 200);
      assert.equal(json.reconciliation.status, 'DESYNCHRONIZED');
      assert.ok(json.reconciliation.diagnostics.length > 0);
    } finally {
      server.close();
    }
  });
});
