import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DataStore } from '../src/server/store';

describe('DataStore Dispute State Transitions & Stats Tests', () => {
  it('updates escrow status to Disputed and Arbitrated cleanly', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safeguard-dispute-test-'));
    try {
      const store = new DataStore(tmpDir);

      store.upsertEscrow({
        id: 'escrow-test-1',
        escrowIndex: 101,
        amount: '200000000',
        token: 'XLM',
        sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
        recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
        status: 'Pending',
      });

      let escrows = store.getEscrows('Pending');
      const found = escrows.find((e) => e.escrowIndex === 101);
      assert.ok(found);
      assert.equal(found.status, 'Pending');

      // Update to Disputed
      const res1 = store.updateEscrowStatus(101, 'Disputed');
      assert.equal(res1, true);
      assert.equal(store.getEscrows('Disputed').length, 1);

      // Verify stats reflect disputed count
      let stats = store.getComplianceStats();
      assert.equal(stats.disputedEscrows, 1);

      // Arbitrate escrow
      const res2 = store.updateEscrowStatus(101, 'Arbitrated');
      assert.equal(res2, true);
      assert.equal(store.getEscrows('Arbitrated').length, 1);

      stats = store.getComplianceStats();
      assert.equal(stats.disputedEscrows, 0);
      assert.equal(stats.arbitratedEscrows, 1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns false when updating nonexistent escrow', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safeguard-dispute-test2-'));
    try {
      const store = new DataStore(tmpDir);
      const res = store.updateEscrowStatus(99999, 'Disputed');
      assert.equal(res, false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
