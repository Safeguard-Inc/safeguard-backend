import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { WebhookDispatcher, defaultDispatcher } from '../src/server/webhooks.js';
import { createApp } from '../src/server/app.js';

describe('Safeguard Webhook Dispatcher Tests', () => {
  test('registers, lists, and unregisters webhook subscriptions', () => {
    const dispatcher = new WebhookDispatcher();
    const sub = dispatcher.register({
      id: 'sub-test-1',
      url: 'https://example.com/webhook',
      events: ['escrow.created', 'policy.blocked'],
      secret: 'supersecret',
      active: true,
    });

    assert.equal(sub.id, 'sub-test-1');
    assert.equal(dispatcher.getSubscriptions().length, 1);
    assert.equal(dispatcher.matches(sub, 'escrow.created'), true);
    assert.equal(dispatcher.matches(sub, 'escrow.released'), false);

    const deleted = dispatcher.unregister('sub-test-1');
    assert.equal(deleted, true);
    assert.equal(dispatcher.getSubscriptions().length, 0);
  });

  test('generates valid HMAC-SHA256 payload signature', () => {
    const dispatcher = new WebhookDispatcher();
    const secret = 'webhook-signing-key-123';
    const body = JSON.stringify({ hello: 'world' });

    const sig = dispatcher.signPayload(secret, body);
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    assert.equal(sig, expected);
  });

  test('dispatches events with correct headers and payload to subscribed endpoints', async () => {
    const dispatcher = new WebhookDispatcher();
    dispatcher.register({
      id: 'sub-listener',
      url: 'https://example.com/escrow-hook',
      events: ['escrow.created'],
      secret: 'secret-key-999',
      active: true,
    });

    let interceptedHeaders: Headers | undefined;
    let interceptedBody: string | undefined;

    const mockFetch = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      interceptedHeaders = new Headers(init?.headers);
      interceptedBody = init?.body as string;
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    };

    const results = await dispatcher.dispatch(
      {
        id: 'evt-001',
        type: 'escrow.created',
        timestamp: 1700000000,
        payload: { escrowIndex: 42, amount: '1000' },
      },
      mockFetch as typeof fetch
    );

    assert.equal(results.length, 1);
    assert.equal(results[0].success, true);
    assert.equal(results[0].status, 200);

    assert.ok(interceptedHeaders);
    assert.equal(interceptedHeaders.get('X-Safeguard-Event'), 'escrow.created');
    assert.equal(interceptedHeaders.get('X-Safeguard-Delivery'), 'evt-001');
    assert.ok(interceptedHeaders.get('X-Safeguard-Signature'));

    assert.ok(interceptedBody);
    const parsedBody = JSON.parse(interceptedBody);
    assert.equal(parsedBody.id, 'evt-001');
    assert.equal(parsedBody.payload.escrowIndex, 42);
  });

  test('HTTP webhook management API manages subscriptions', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      // 1. Subscribe
      const resSub = await fetch(`http://localhost:${port}/api/webhooks/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://compliance.enterprise.com/hook',
          events: ['policy.blocked'],
          secret: 'client-key',
        }),
      });
      assert.equal(resSub.status, 201);
      const dataSub = (await resSub.json()) as any;
      assert.equal(dataSub.success, true);
      const subId = dataSub.data.id;
      assert.ok(subId);

      // 2. List
      const resList = await fetch(`http://localhost:${port}/api/webhooks/subscriptions`);
      assert.equal(resList.status, 200);
      const dataList = (await resList.json()) as any;
      assert.ok(dataList.data.some((s: any) => s.id === subId));

      // 3. Delete
      const resDel = await fetch(`http://localhost:${port}/api/webhooks/subscriptions/${subId}`, {
        method: 'DELETE',
      });
      assert.equal(resDel.status, 200);
    } finally {
      server.close();
    }
  });

  test('retries transient failures and succeeds on subsequent attempt', async () => {
    const dispatcher = new WebhookDispatcher();
    dispatcher.register({
      id: 'sub-retry',
      url: 'https://example.com/retry-hook',
      events: ['escrow.created'],
      secret: 'secret-retry',
      active: true,
    });

    let callCount = 0;
    const mockFetch = async (): Promise<Response> => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Connection reset by peer');
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    const results = await dispatcher.dispatchWithRetry(
      {
        id: 'evt-retry-1',
        type: 'escrow.created',
        timestamp: 1700000000,
        payload: { amount: '500' },
      },
      3,
      mockFetch as typeof fetch
    );

    assert.equal(results.length, 1);
    assert.equal(results[0].success, true);
    assert.equal(results[0].retriesAttempted, 1);
    assert.equal(dispatcher.getDeadLetterQueue().length, 0);
  });

  test('archives delivery to dead-letter queue after exhausting all retries', async () => {
    const dispatcher = new WebhookDispatcher();
    dispatcher.register({
      id: 'sub-failing',
      url: 'https://broken.endpoint.com/webhook',
      events: ['system.alert'],
      secret: 'secret-fail',
      active: true,
    });

    const mockFetch = async (): Promise<Response> => {
      throw new Error('HTTP 503 Service Unavailable');
    };

    const results = await dispatcher.dispatchWithRetry(
      {
        id: 'evt-dead-1',
        type: 'system.alert',
        timestamp: 1700000000,
        payload: { alert: 'critical' },
      },
      2,
      mockFetch as typeof fetch
    );

    assert.equal(results.length, 1);
    assert.equal(results[0].success, false);
    assert.equal(results[0].retriesAttempted, 3); // initial + 2 retries

    const dlq = dispatcher.getDeadLetterQueue();
    assert.equal(dlq.length, 1);
    assert.equal(dlq[0].event.id, 'evt-dead-1');
    assert.equal(dlq[0].subscriptionId, 'sub-failing');
    assert.match(dlq[0].error, /503 Service Unavailable/);

    dispatcher.clearDeadLetterQueue();
    assert.equal(dispatcher.getDeadLetterQueue().length, 0);
  });
});
