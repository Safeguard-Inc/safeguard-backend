import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../src/server/app';
import { defaultStore } from '../src/server/store';

describe('Transaction Hash Lookup API Tests', () => {
  it('looks up transaction by valid Stellar hash over HTTP', async () => {
    const knownHash = 'c762b42f818387aa584ea33d3da006f22671071ed6e182068994ea6597395e6c';
    defaultStore.addTransaction({
      id: 'tx-hash-lookup-test',
      sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
      recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
      token: 'XLM',
      amount: '100000000',
      status: 'Approved',
      reason: 'Under spend cap',
      timestamp: Date.now(),
      txHash: knownHash,
    });

    const app = createApp();
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/transactions/hash/${knownHash}`);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.transaction.txHash, knownHash);
      assert.equal(data.transaction.status, 'Approved');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('returns HTTP 404 when querying unknown transaction hash', async () => {
    const app = createApp();
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/transactions/hash/0000000000000000000000000000000000000000000000000000000000000000`);
      assert.equal(res.status, 404);

      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.error?.includes('Transaction not found'));
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
