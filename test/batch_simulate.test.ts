import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server/app.js';

describe('Enterprise Batch Simulation API Tests', () => {
  const DENYLISTED = 'GCV4I3P3F2OMWYZGRXD5PR5AC3K7MUDSBMKDBPEMJ2MFHLVUAGJEK4DT';

  test('POST /api/pay/simulate-batch executes mixed compliance batch and returns summary metrics', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    const payload = {
      payments: [
        {
          sender: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
          recipient: 'GCXKG6RN4ONIEPCMNFB732A436Z5PNDSRLGHD7UYWU7JZX2TM7GXM5YF',
          token: 'CAS3J7GYLGXMF6TDJBBYYSE3VBMNOU345TLRMQPO2SL7PGBZ6YZZIFEX',
          amount: '10000000', // 1 XLM -> Approved
          memo: { type: 'text', value: 'Payroll #1' },
        },
        {
          sender: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
          recipient: 'GB222222222222222222222222222222222222222222222222222222',
          token: 'CAS3J7GYLGXMF6TDJBBYYSE3VBMNOU345TLRMQPO2SL7PGBZ6YZZIFEX',
          amount: '2000000000', // 200 XLM -> Escrowed
        },
        {
          sender: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
          recipient: DENYLISTED,
          token: 'CAS3J7GYLGXMF6TDJBBYYSE3VBMNOU345TLRMQPO2SL7PGBZ6YZZIFEX',
          amount: '5000000', // 0.5 XLM -> Blocked
        },
      ],
    };

    try {
      const res = await fetch(`http://localhost:${port}/api/pay/simulate-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 200);
      const json = (await res.json()) as any;

      assert.equal(json.success, true);
      assert.equal(json.count, 3);
      assert.equal(json.summary.approvedCount, 1);
      assert.equal(json.summary.escrowedCount, 1);
      assert.equal(json.summary.blockedCount, 1);
      assert.equal(json.summary.approvalRatePercent, 33);
      assert.equal(json.summary.totalApprovedStroops, '10000000');
      assert.equal(json.summary.totalEscrowedStroops, '2000000000');
      assert.equal(json.summary.totalBlockedStroops, '5000000');
      assert.equal(json.summary.totalVolumeStroops, '2015000000');
      assert.equal(json.data.length, 3);
      assert.equal(json.data[0].verdict.decision, 'APPROVE');
      assert.equal(json.data[1].verdict.decision, 'FLAG');
      assert.equal(json.data[2].verdict.decision, 'BLOCK');
    } finally {
      server.close();
    }
  });

  test('POST /api/pay/simulate-batch rejects invalid requests with HTTP 400', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/api/pay/simulate-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments: [] }),
      });

      assert.equal(res.status, 400);
      const json = (await res.json()) as any;
      assert.equal(json.success, false);
    } finally {
      server.close();
    }
  });
});
