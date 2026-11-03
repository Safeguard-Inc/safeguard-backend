import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../src/server/app';
import { SafeguardClient } from '../src/sdk/client';

describe('Batch Jurisdiction Compliance API Tests', () => {
  it('queries batch jurisdiction and resolves domestic flags', async () => {
    const client = new SafeguardClient();
    const US_ACCOUNT = 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4';
    const UK_ACCOUNT = 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT';
    const UNKNOWN_ACCOUNT = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';

    client.setJurisdictions([
      { address: US_ACCOUNT, jurisdiction: 840 }, // ISO 3166-1 US
      { address: UK_ACCOUNT, jurisdiction: 826 }, // ISO 3166-1 UK
    ]);

    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/compliance/jurisdiction/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addresses: [US_ACCOUNT, UK_ACCOUNT, UNKNOWN_ACCOUNT],
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.count, 3);
      assert.equal(data.results.length, 3);

      assert.equal(data.results[0].address, US_ACCOUNT);
      assert.equal(data.results[0].jurisdiction, 840);
      assert.equal(data.results[0].isDomestic, true);

      assert.equal(data.results[1].address, UK_ACCOUNT);
      assert.equal(data.results[1].jurisdiction, 826);
      assert.equal(data.results[1].isDomestic, false);

      assert.equal(data.results[2].address, UNKNOWN_ACCOUNT);
      assert.equal(data.results[2].jurisdiction, undefined);
      assert.equal(data.results[2].isDomestic, false);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
