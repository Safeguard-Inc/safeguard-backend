import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CursorStore } from '../src/server/cursorStore.ts';

describe('Soroban Event Indexer CursorStore Resiliency Tests', () => {
  const tmpFile = path.join(os.tmpdir(), `safeguard-cursor-test-${Date.now()}.json`);

  afterEach(() => {
    if (fs.existsSync(tmpFile)) {
      try {
        fs.unlinkSync(tmpFile);
      } catch {}
    }
  });

  test('saves and loads cursor state accurately in memory', () => {
    const store = new CursorStore();
    const contractId = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';

    store.set({
      contractId,
      lastLedger: 104523,
      lastCursor: '000000000104523-0001',
      updatedAt: 1700000000,
    });

    const loaded = store.get(contractId);
    assert.ok(loaded);
    assert.equal(loaded.contractId, contractId);
    assert.equal(loaded.lastLedger, 104523);
    assert.equal(loaded.lastCursor, '000000000104523-0001');
  });

  test('advances ledger sequence monotonically and persists to file', () => {
    const store = new CursorStore({ storageFile: tmpFile });
    const contractId = 'CBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

    store.advance(contractId, 500, 'cursor-500');
    assert.equal(store.get(contractId)?.lastLedger, 500);

    // Advance to higher ledger
    store.advance(contractId, 550, 'cursor-550');
    assert.equal(store.get(contractId)?.lastLedger, 550);
    assert.equal(store.get(contractId)?.lastCursor, 'cursor-550');

    // Attempting to advance to lower ledger preserves monotonic progress
    store.advance(contractId, 520, 'cursor-520');
    assert.equal(store.get(contractId)?.lastLedger, 550);

    // Create a new store reading the same file
    const recovered = new CursorStore({ storageFile: tmpFile });
    const recState = recovered.get(contractId);
    assert.ok(recState);
    assert.equal(recState.lastLedger, 550);
    assert.equal(recState.lastCursor, 'cursor-520');
  });

  test('falls back safely when file is corrupted', () => {
    fs.writeFileSync(tmpFile, '{ malformed json :: invalid', 'utf8');
    const store = new CursorStore({ storageFile: tmpFile });
    assert.equal(store.get('ANY_CONTRACT'), null);
  });
});
