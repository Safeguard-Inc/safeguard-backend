import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createApp } from '../src/server/app';
import { SafeguardClient } from '../src/sdk/client';
import { DataStore, defaultStore } from '../src/server/store';

describe('Bulk Escrow Arbitration API & DataStore Tests', () => {
  it('bulk arbitrates multiple disputed escrows and tracks successful vs failed ones in DataStore', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safeguard-bulk-arb-'));
    try {
      const store = new DataStore(tmpDir);

      store.upsertEscrow({
        id: 'esc-arb-1',
        escrowIndex: 401,
        amount: '100000000',
        token: 'XLM',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Disputed',
      });

      store.upsertEscrow({
        id: 'esc-arb-2',
        escrowIndex: 402,
        amount: '200000000',
        token: 'USDC',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Pending', // not disputed -> cannot arbitrate
      });

      store.upsertEscrow({
        id: 'esc-arb-3',
        escrowIndex: 403,
        amount: '300000000',
        token: 'XLM',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Disputed',
      });

      // Arbitrate batch to recipient (Released): 401 (disputed -> succeeds), 402 (pending -> fails), 403 (disputed -> succeeds), 999 (fails)
      const res = store.arbitrateEscrowsBatch([401, 402, 403, 999], true);
      assert.deepEqual(res.arbitrated, [401, 403]);
      assert.equal(res.failed.length, 2);
      assert.equal(res.failed[0].escrowIndex, 402);
      assert.equal(res.failed[1].escrowIndex, 999);

      // Verify statuses updated to Released
      const escrows = store.getEscrows();
      assert.equal(escrows.find((e) => e.escrowIndex === 401)?.status, 'Released');
      assert.equal(escrows.find((e) => e.escrowIndex === 403)?.status, 'Released');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('handles HTTP POST /api/escrows/batch/arbitrate end-to-end', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      defaultStore.upsertEscrow({
        id: 'esc-http-arb-201',
        escrowIndex: 1201,
        amount: '1000000',
        token: 'XLM',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Disputed',
      });

      const res = await fetch(`http://127.0.0.1:${port}/api/escrows/batch/arbitrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrowIds: [1201], releaseToRecipient: false }), // Refund
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.arbitratedCount, 1);
      assert.deepEqual(data.arbitrated, [1201]);

      const updated = defaultStore.getEscrows().find((e) => e.escrowIndex === 1201);
      assert.equal(updated?.status, 'Refunded');

      // Invalid releaseToRecipient format
      const badRes = await fetch(`http://127.0.0.1:${port}/api/escrows/batch/arbitrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrowIds: [1201], releaseToRecipient: 'yes' }),
      });
      assert.equal(badRes.status, 400);
    } finally {
      server.close();
    }
  });
});
