import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../src/server/app';
import { SafeguardClient } from '../src/sdk/client';

describe('Contracts Configuration API Endpoint Tests', () => {
  it('GET /api/config/contracts returns live contract addresses and parameters', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/config/contracts`);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.contracts);
      assert.ok(data.contracts.network);
      assert.ok(data.contracts.rpcUrl);
      assert.ok(data.contracts.paymentsContract);
      assert.ok(data.contracts.policyContract);
      assert.ok(data.contracts.config);
      assert.equal(typeof data.contracts.config.isPaused, 'boolean');
      assert.equal(data.contracts.config.schemaVersion, 1);
    } finally {
      server.close();
    }
  });
});
