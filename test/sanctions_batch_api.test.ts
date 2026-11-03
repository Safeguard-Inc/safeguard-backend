import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createRouter } from '../src/server/routes.ts';
import { SafeguardClient } from '../src/sdk/client.ts';
import type { Server } from 'http';

describe('Batch Sanctions Compliance Screening API Tests', () => {
  const S_ACTIVE = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  const S_CLEAN = 'GA6LW724VD6PVAG6U3Z3I342OKAQ6CVT5AC4YIN6STMV5Y5REB335AD3';
  const S_RETIRED = 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4';

  test('screens batch of addresses with active and clean sanctions states over HTTP', async () => {
    const client = new SafeguardClient();
    client.setSanctionsEntries([
      {
        address: S_ACTIVE,
        listId: 'OFAC-SDN-2026',
        status: 'ACTIVE',
        datasetVersion: 4,
      },
      {
        address: S_RETIRED,
        listId: 'EU-FINSAN-2025',
        status: 'RETIRED',
        datasetVersion: 2,
      },
    ]);

    const app = express();
    app.use(express.json());
    app.use(createRouter(client));

    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    try {
      const port = (server.address() as any).port;
      const res = await fetch(`http://127.0.0.1:${port}/api/compliance/sanctions/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addresses: [S_ACTIVE, S_CLEAN, S_RETIRED],
        }),
      });

      assert.equal(res.status, 200);
      const json: any = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.count, 3);
      assert.equal(json.sanctionedCount, 1);
      assert.equal(json.allClear, false);

      const activeMatch = json.results.find((r: any) => r.address === S_ACTIVE);
      assert.ok(activeMatch);
      assert.equal(activeMatch.isSanctioned, true);
      assert.equal(activeMatch.details?.listId, 'OFAC-SDN-2026');

      const cleanMatch = json.results.find((r: any) => r.address === S_CLEAN);
      assert.ok(cleanMatch);
      assert.equal(cleanMatch.isSanctioned, false);
      assert.equal(cleanMatch.details, undefined);

      const retiredMatch = json.results.find((r: any) => r.address === S_RETIRED);
      assert.ok(retiredMatch);
      assert.equal(retiredMatch.isSanctioned, false);
      assert.equal(retiredMatch.details?.status, 'RETIRED');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('returns allClear true when all addresses in batch are unsanctioned', async () => {
    const client = new SafeguardClient();
    const app = express();
    app.use(express.json());
    app.use(createRouter(client));

    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    try {
      const port = (server.address() as any).port;
      const res = await fetch(`http://127.0.0.1:${port}/api/compliance/sanctions/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addresses: [S_CLEAN],
        }),
      });

      assert.equal(res.status, 200);
      const json: any = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.sanctionedCount, 0);
      assert.equal(json.allClear, true);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
