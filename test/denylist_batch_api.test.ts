import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../src/server/app';
import { SafeguardClient } from '../src/sdk/client';

describe('Batch Compliance Denylist API Tests', () => {
  const CANONICAL_DENYLISTED = 'GCV4I3P3F2OMWYZGRXD5PR5AC3K7MUDSBMKDBPEMJ2MFHLVUAGJEK4DT';
  const CLEAN_ADDRESS = 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4';

  it('checks batch denylist status over HTTP accurately', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const payload = {
        addresses: [
          CLEAN_ADDRESS,
          CANONICAL_DENYLISTED,
          'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        ],
      };

      const res = await fetch(`http://127.0.0.1:${port}/api/compliance/denylist/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.totalChecked, 3);
      assert.equal(data.totalBlocked, 1);
      assert.equal(data.results[0].isDenylisted, false);
      assert.equal(data.results[1].isDenylisted, true);
      assert.equal(data.results[2].isDenylisted, false);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('mutates denylist in batch (add and remove) over HTTP', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const target = 'GBVOL67TMUQBGL4TZDXHN3CQ7XA354OIO65LOHY2KV2G26H7G2M2PA2Z';
      assert.equal(client.isDenylisted(target), false);

      // Add to denylist
      const addRes = await fetch(`http://127.0.0.1:${port}/api/compliance/denylist/batch/mutate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', addresses: [target] }),
      });
      assert.equal(addRes.status, 200);
      assert.equal(client.isDenylisted(target), true);

      // Remove from denylist
      const remRes = await fetch(`http://127.0.0.1:${port}/api/compliance/denylist/batch/mutate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', addresses: [target] }),
      });
      assert.equal(remRes.status, 200);
      assert.equal(client.isDenylisted(target), false);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
