import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../src/server/app';
import { SafeguardClient } from '../src/sdk/client';
import { defaultStore } from '../src/server/store';

describe('Balance Sheet Export API Endpoint Tests', () => {
  it('GET /api/export/balance-sheet returns valid JSON statement by default', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      // Seed an escrow
      defaultStore.upsertEscrow({
        id: 'escrow-bs-1',
        escrowIndex: 101,
        amount: '5000000000', // 500 XLM
        token: 'XLM',
        sender: 'GALICE111',
        recipient: 'GBOB222',
        releaseAfter: Math.floor(Date.now() / 1000) + 3600,
        status: 'Pending',
        createdAt: Date.now(),
      });

      const res = await fetch(`http://127.0.0.1:${port}/api/export/balance-sheet`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.statement);
      assert.ok(json.statement.statementId);
      assert.equal(json.statement.reportingCurrency, 'USD');
      assert.ok(json.statement.auditSignatureHash.length === 64);
      assert.ok(Array.isArray(json.statement.assets));
      assert.ok(json.statement.assets.length >= 1);
    } finally {
      server.close();
    }
  });

  it('GET /api/export/balance-sheet?format=markdown returns markdown document', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/export/balance-sheet?format=markdown&organization=GlobalClearingCorp`);
      assert.equal(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('text/markdown'));

      const text = await res.text();
      assert.ok(text.includes('Safeguard Institutional Balance Sheet'));
      assert.ok(text.includes('GlobalClearingCorp'));
      assert.ok(text.includes('Collateral & Escrow Summary'));
    } finally {
      server.close();
    }
  });

  it('GET /api/export/balance-sheet?download=true sets Content-Disposition header', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/export/balance-sheet?download=true`);
      assert.equal(res.status, 200);
      const disposition = res.headers.get('content-disposition');
      assert.ok(disposition);
      assert.ok(disposition.includes('attachment; filename="safeguard-balance-sheet-'));
    } finally {
      server.close();
    }
  });
});
