import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../src/server/app';
import { defaultDispatcher } from '../src/server/webhooks';

describe('Webhook DLQ API Endpoint Tests', () => {
  it('inspects, clears, and replays dead-letter webhook items over HTTP', async () => {
    const app = createApp();
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      // 1. Initially clear DLQ
      defaultDispatcher.clearDeadLetterQueue();

      const initialRes = await fetch(`http://127.0.0.1:${port}/api/webhooks/dlq`);
      assert.equal(initialRes.status, 200);
      const initialData = await initialRes.json();
      assert.equal(initialData.success, true);
      assert.equal(initialData.count, 0);

      // 2. Add failed item to DLQ through internal helper
      defaultDispatcher['pushToDeadLetterQueue']({
        event: { event: 'payment.settled', timestamp: Date.now(), data: { id: 'test-1' } },
        subscriptionId: 'sub-test-1',
        url: 'http://127.0.0.1:9999/failed-webhook',
        error: 'ECONNREFUSED',
        failedAt: Date.now(),
        retryCount: 3,
      });

      // 3. Inspect populated DLQ
      const populatedRes = await fetch(`http://127.0.0.1:${port}/api/webhooks/dlq`);
      assert.equal(populatedRes.status, 200);
      const populatedData = await populatedRes.json();
      assert.equal(populatedData.count, 1);
      assert.equal(populatedData.items[0].subscriptionId, 'sub-test-1');

      // 4. Replay DLQ items
      const replayRes = await fetch(`http://127.0.0.1:${port}/api/webhooks/dlq/replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 1 }),
      });
      assert.equal(replayRes.status, 200);
      const replayData = await replayRes.json();
      assert.equal(replayData.success, true);
      assert.equal(replayData.replayedCount, 1);

      // 5. Clear DLQ
      const clearRes = await fetch(`http://127.0.0.1:${port}/api/webhooks/dlq`, {
        method: 'DELETE',
      });
      assert.equal(clearRes.status, 200);
      const clearData = await clearRes.json();
      assert.equal(clearData.success, true);
      assert.equal(clearData.message, 'Dead letter queue cleared');
    } finally {
      server.close();
    }
  });
});
