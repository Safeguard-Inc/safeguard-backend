import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server/app.js';
import { defaultStore } from '../src/server/store.js';

describe('Transaction Export Endpoint Tests', () => {
  test('GET /api/export/transactions returns CSV by default with attachment headers', async () => {
    defaultStore.addTransaction({
      id: `exp-tx-1-${Date.now()}`,
      sender: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      recipient: 'GCXKG6RN4ONIEPCMNFB732A436Z5PNDSRLGHD7UYWU7JZX2TM7GXM5YF',
      token: 'CAS3J7GYLGXMF6TDJBBYYSE3VBMNOU345TLRMQPO2SL7PGBZ6YZZIFEX',
      amount: '50000000',
      status: 'Approved',
      reason: 'Export test payment',
      timestamp: Date.now(),
    });

    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/api/export/transactions`);
      assert.equal(res.status, 200);

      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('text/csv'));

      const disposition = res.headers.get('content-disposition') || '';
      assert.ok(disposition.includes('attachment; filename="safeguard-transactions-'));
      assert.ok(disposition.endsWith('.csv"'));

      const csvText = await res.text();
      const lines = csvText.split('\r\n');
      assert.ok(lines.length >= 2);
      assert.equal(
        lines[0],
        'id,timestamp,sender,recipient,token,amount,status,reason,txHash,ledger'
      );
    } finally {
      server.close();
    }
  });

  test('GET /api/export/transactions?format=json returns valid JSON array', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/api/export/transactions?format=json`);
      assert.equal(res.status, 200);

      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('application/json'));

      const disposition = res.headers.get('content-disposition') || '';
      assert.ok(disposition.includes('attachment; filename="safeguard-transactions-'));
      assert.ok(disposition.endsWith('.json"'));

      const json = await res.json();
      assert.ok(Array.isArray(json));
      assert.ok(json.length > 0);
      assert.ok(json[0].id);
      assert.ok(json[0].sender);
    } finally {
      server.close();
    }
  });
});
