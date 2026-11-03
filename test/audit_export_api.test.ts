import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server/app.js';
import { defaultStore } from '../src/server/store.js';
import { AuditLogStreamExporter } from '../src/sdk/auditLogExporter.js';

describe('Audit Logs Export API Tests', () => {
  test('GET /api/export/audit-logs returns NDJSON stream by default', async () => {
    defaultStore.addTransaction({
      id: `audit-tx-1-${Date.now()}`,
      sender: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      recipient: 'GCXKG6RN4ONIEPCMNFB732A436Z5PNDSRLGHD7UYWU7JZX2TM7GXM5YF',
      token: 'CAS3J7GYLGXMF6TDJBBYYSE3VBMNOU345TLRMQPO2SL7PGBZ6YZZIFEX',
      amount: '50000000',
      status: 'Approved',
      reason: 'Audit export NDJSON test',
      timestamp: Date.now(),
    });

    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/api/export/audit-logs`);
      assert.equal(res.status, 200);

      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('application/x-ndjson'));

      const disposition = res.headers.get('content-disposition') || '';
      assert.ok(disposition.includes('attachment; filename="safeguard-audit-logs-'));
      assert.ok(disposition.endsWith('.ndjson"'));

      const bodyText = await res.text();
      const events = AuditLogStreamExporter.parseNdjson(bodyText);
      assert.ok(events.length > 0);
      assert.ok(events[0].event_id);
      assert.ok(events[0].integrity_hash);
      assert.equal(events[0].category, 'payment');
    } finally {
      server.close();
    }
  });

  test('GET /api/export/audit-logs?format=json returns valid JSON array', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/api/export/audit-logs?format=json`);
      assert.equal(res.status, 200);

      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('application/json'));

      const data = await res.json();
      assert.ok(Array.isArray(data));
      if (data.length > 0) {
        assert.ok(data[0]['@timestamp']);
        assert.ok(data[0].integrity_hash);
      }
    } finally {
      server.close();
    }
  });

  test('GET /api/export/audit-logs?format=syslog returns RFC 5424 text log stream', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/api/export/audit-logs?format=syslog`);
      assert.equal(res.status, 200);

      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('text/plain'));

      const logText = await res.text();
      assert.ok(logText.includes('<14>1') || logText.includes('<12>1') || logText.length === 0);
    } finally {
      server.close();
    }
  });
});
