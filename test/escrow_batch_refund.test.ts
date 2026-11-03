import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createApp } from '../src/server/app';
import { SafeguardClient } from '../src/sdk/client';
import { DataStore, defaultStore } from '../src/server/store';

describe('Bulk Escrow Refund API & DataStore Tests', () => {
  it('bulk refunds multiple escrows and tracks successful vs failed ones in DataStore', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safeguard-bulk-refund-'));
    try {
      const store = new DataStore(tmpDir);

      store.upsertEscrow({
        id: 'esc-ref-1',
        escrowIndex: 701,
        amount: '100000000',
        token: 'XLM',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Pending',
      });

      store.upsertEscrow({
        id: 'esc-ref-2',
        escrowIndex: 702,
        amount: '200000000',
        token: 'USDC',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Released', // already settled
      });

      store.upsertEscrow({
        id: 'esc-ref-3',
        escrowIndex: 703,
        amount: '300000000',
        token: 'XLM',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Pending',
      });

      // Refund batch: 701 (pending -> succeeds), 702 (already settled -> fails), 703 (pending -> succeeds), 999 (nonexistent -> fails)
      const res = store.refundEscrowsBatch([701, 702, 703, 999]);
      assert.deepEqual(res.refunded, [701, 703]);
      assert.equal(res.failed.length, 2);
      assert.equal(res.failed[0].escrowIndex, 702);
      assert.equal(res.failed[1].escrowIndex, 999);

      // Verify statuses updated
      const escrows = store.getEscrows();
      assert.equal(escrows.find((e) => e.escrowIndex === 701)?.status, 'Refunded');
      assert.equal(escrows.find((e) => e.escrowIndex === 703)?.status, 'Refunded');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('handles HTTP POST /api/escrows/batch/refund end-to-end', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      defaultStore.upsertEscrow({
        id: 'esc-http-901',
        escrowIndex: 901,
        amount: '1000000',
        token: 'XLM',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Pending',
      });

      const res = await fetch(`http://127.0.0.1:${port}/api/escrows/batch/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrowIds: [901] }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.refundedCount, 1);
      assert.deepEqual(data.refunded, [901]);

      // Invalid empty body
      const badRes = await fetch(`http://127.0.0.1:${port}/api/escrows/batch/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrowIds: [] }),
      });
      assert.equal(badRes.status, 400);

      // Non-number array
      const badIdRes = await fetch(`http://127.0.0.1:${port}/api/escrows/batch/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrowIds: ['invalid'] }),
      });
      assert.equal(badIdRes.status, 400);
    } finally {
      server.close();
    }
  });
});
