import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { SafeguardClient } from '../src/sdk/client.js';
import { createApp } from '../src/server/app.js';

describe('SafeguardClient Simulation Caching Tests', () => {
  it('stores and reuses cached simulation result when useCache is enabled', async () => {
    const client = new SafeguardClient();
    assert.strictEqual(client.getSimulationCacheSize(), 0);

    const params = {
      sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
      recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
      token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
      amount: '500000000', // 50 XLM
    };

    const first = await client.simulatePayment(params, true);
    assert.strictEqual(first.decision, 'APPROVE');
    assert.strictEqual(client.getSimulationCacheSize(), 1);

    const second = await client.simulatePayment(params, true);
    assert.strictEqual(second.decision, 'APPROVE');
    assert.strictEqual(second.timestamp, first.timestamp); // identical object from cache

    client.clearSimulationCache();
    assert.strictEqual(client.getSimulationCacheSize(), 0);
  });

  it('does not cache when useCache is false (default)', async () => {
    const client = new SafeguardClient();
    const params = {
      sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
      recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
      token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
      amount: '500000000',
    };

    await client.simulatePayment(params, false);
    assert.strictEqual(client.getSimulationCacheSize(), 0);
  });

  it('supports caching via ?cache=true query parameter on the endpoint', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 4000;

    const payload = {
      sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
      recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
      token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
      amount: '10000000',
    };

    const res1 = await fetch(`http://127.0.0.1:${port}/api/pay/simulate?cache=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(client.getSimulationCacheSize(), 1);

    const res2 = await fetch(`http://127.0.0.1:${port}/api/pay/simulate?cache=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.strictEqual(res2.status, 200);

    const json1 = (await res1.json()) as any;
    const json2 = (await res2.json()) as any;
    assert.strictEqual(json1.data.timestamp, json2.data.timestamp);

    server.close();
  });
});
