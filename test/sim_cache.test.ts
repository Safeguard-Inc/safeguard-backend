import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SafeguardClient } from '../src/sdk/client.js';

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
});
