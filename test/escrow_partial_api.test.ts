import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createApp } from '../src/server/app';
import { SafeguardClient } from '../src/sdk/client';
import { DataStore, defaultStore } from '../src/server/store';

describe('Escrow Partial Release API & DataStore Tests', () => {
  it('partially releases escrow amount and updates status when fully depleted in DataStore', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safeguard-escrow-partial-'));
    try {
      const store = new DataStore(tmpDir);

      store.upsertEscrow({
        id: 'escrow-part-1',
        escrowIndex: 501,
        amount: '100000000',
        token: 'XLM',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Pending',
      });

      // 1. Partial release of 40000000
      const res1 = store.releaseEscrowPartial(501, '40000000');
      assert.equal(res1.success, true);
      assert.equal(res1.escrow?.amount, '60000000');
      assert.equal(res1.escrow?.status, 'Pending');

      // 2. Reject over-release (attempt 70000000 on remaining 60000000)
      const res2 = store.releaseEscrowPartial(501, '70000000');
      assert.equal(res2.success, false);
      assert.match(res2.error || '', /exceeds escrow balance/i);

      // 3. Reject zero or negative release
      const res3 = store.releaseEscrowPartial(501, '0');
      assert.equal(res3.success, false);

      // 4. Release remaining 60000000
      const res4 = store.releaseEscrowPartial(501, '60000000');
      assert.equal(res4.success, true);
      assert.equal(res4.escrow?.amount, '0');
      assert.equal(res4.escrow?.status, 'Released');

      // 5. Settled escrow cannot be released again
      const res5 = store.releaseEscrowPartial(501, '10000000');
      assert.equal(res5.success, false);
      assert.match(res5.error || '', /Cannot release escrow with status Released/i);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('handles HTTP POST /api/escrows/:id/release-partial end-to-end', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      // Upsert an escrow into defaultStore
      defaultStore.upsertEscrow({
        id: 'escrow-http-test',
        escrowIndex: 777,
        amount: '50000000',
        token: 'USDC',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Pending',
      });

      // Successful partial release
      const res = await fetch(`http://127.0.0.1:${port}/api/escrows/777/release-partial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: '20000000' }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.amount, '30000000');
      assert.equal(data.data.status, 'Pending');

      // Bad request with missing amount
      const badReq = await fetch(`http://127.0.0.1:${port}/api/escrows/777/release-partial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.equal(badReq.status, 400);

      // Non-existent escrow id
      const notFoundReq = await fetch(`http://127.0.0.1:${port}/api/escrows/999999/release-partial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: '1000' }),
      });
      assert.equal(notFoundReq.status, 400);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
