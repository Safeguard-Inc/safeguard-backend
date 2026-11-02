import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/server/app.js';

describe('RequestId Middleware Tests', () => {
  it('assigns a unique x-request-id header when not provided', async () => {
    const app = createApp();
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const res = await fetch(`http://localhost:${port}/health`);
    assert.strictEqual(res.status, 200);

    const requestId = res.headers.get('x-request-id');
    assert.ok(requestId, 'x-request-id header should be present');
    assert.match(
      requestId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'should be valid UUID'
    );

    server.close();
  });

  it('echoes back an existing incoming x-request-id header', async () => {
    const app = createApp();
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const customId = 'client-req-999888';
    const res = await fetch(`http://localhost:${port}/health`, {
      headers: { 'x-request-id': customId },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('x-request-id'), customId);

    server.close();
  });
});

