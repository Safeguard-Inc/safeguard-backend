import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createApp } from '../src/server/app';
import { SafeguardClient } from '../src/sdk/client';
import { DataStore, defaultStore } from '../src/server/store';

describe('Bulk Escrow Release API & DataStore Tests', () => {
  it('bulk releases multiple escrows and tracks successful vs failed ones in DataStore', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safeguard-bulk-escrow-'));
    try {
      const store = new DataStore(tmpDir);

      store.upsertEscrow({
        id: 'esc-1',
        escrowIndex: 601,
        amount: '100000000',
        token: 'XLM',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Pending',
      });

      store.upsertEscrow({
        id: 'esc-2',
        escrowIndex: 602,
        amount: '200000000',
        token: 'USDC',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Refunded', // already settled
      });

      store.upsertEscrow({
        id: 'esc-3',
        escrowIndex: 603,
        amount: '300000000',
        token: 'XLM',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Pending',
      });

      // Release batch: 601 (pending -> succeeds), 602 (already settled -> fails), 603 (pending -> succeeds), 999 (nonexistent -> fails)
      const res = store.releaseEscrowsBatch([601, 602, 603, 999]);
      assert.deepEqual(res.released, [601, 603]);
      assert.equal(res.failed.length, 2);
      assert.equal(res.failed[0].escrowIndex, 602);
      assert.equal(res.failed[1].escrowIndex, 999);

      // Verify statuses updated
      const escrows = store.getEscrows();
      assert.equal(escrows.find((e) => e.escrowIndex === 601)?.status, 'Released');
      assert.equal(escrows.find((e) => e.escrowIndex === 603)?.status, 'Released');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('handles HTTP POST /api/escrows/batch/release end-to-end', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      defaultStore.upsertEscrow({
        id: 'esc-http-801',
        escrowIndex: 801,
        amount: '1000000',
        token: 'XLM',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Pending',
      });

      const res = await fetch(`http://127.0.0.1:${port}/api/escrows/batch/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrowIds: [801] }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.releasedCount, 1);
      assert.deepEqual(data.released, [801]);

      // Invalid empty body
      const badRes = await fetch(`http://127.0.0.1:${port}/api/escrows/batch/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrowIds: [] }),
      });
      assert.equal(badRes.status, 400);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
