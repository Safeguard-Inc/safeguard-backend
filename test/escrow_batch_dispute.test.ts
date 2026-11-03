import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createApp } from '../src/server/app';
import { SafeguardClient } from '../src/sdk/client';
import { DataStore, defaultStore } from '../src/server/store';

describe('Bulk Escrow Dispute API & DataStore Tests', () => {
  it('bulk disputes multiple escrows and tracks successful vs failed ones in DataStore', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safeguard-bulk-dispute-'));
    try {
      const store = new DataStore(tmpDir);

      store.upsertEscrow({
        id: 'esc-disp-1',
        escrowIndex: 501,
        amount: '100000000',
        token: 'XLM',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Pending',
      });

      store.upsertEscrow({
        id: 'esc-disp-2',
        escrowIndex: 502,
        amount: '200000000',
        token: 'USDC',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Disputed', // already disputed
      });

      store.upsertEscrow({
        id: 'esc-disp-3',
        escrowIndex: 503,
        amount: '300000000',
        token: 'XLM',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Pending',
      });

      // Dispute batch: 501 (pending -> succeeds), 502 (already disputed -> fails), 503 (pending -> succeeds), 999 (nonexistent -> fails)
      const res = store.disputeEscrowsBatch([501, 502, 503, 999]);
      assert.deepEqual(res.disputed, [501, 503]);
      assert.equal(res.failed.length, 2);
      assert.equal(res.failed[0].escrowIndex, 502);
      assert.equal(res.failed[1].escrowIndex, 999);

      // Verify statuses updated
      const escrows = store.getEscrows();
      assert.equal(escrows.find((e) => e.escrowIndex === 501)?.status, 'Disputed');
      assert.equal(escrows.find((e) => e.escrowIndex === 503)?.status, 'Disputed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('handles HTTP POST /api/escrows/batch/dispute end-to-end', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      defaultStore.upsertEscrow({
        id: 'esc-http-disp-101',
        escrowIndex: 1001,
        amount: '1000000',
        token: 'XLM',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Pending',
      });

      const res = await fetch(`http://127.0.0.1:${port}/api/escrows/batch/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrowIds: [1001] }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.disputedCount, 1);
      assert.deepEqual(data.disputed, [1001]);

      // Invalid empty body
      const badRes = await fetch(`http://127.0.0.1:${port}/api/escrows/batch/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrowIds: [] }),
      });
      assert.equal(badRes.status, 400);

      // Non-number array
      const badIdRes = await fetch(`http://127.0.0.1:${port}/api/escrows/batch/dispute`, {
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
