import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/server/app.js';

describe('Security Headers Middleware Tests', () => {
  it('sets standard defensive security headers on responses', async () => {
    const app = createApp();
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const res = await fetch(`http://localhost:${port}/health`);
    assert.strictEqual(res.status, 200);

    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
    assert.strictEqual(res.headers.get('x-xss-protection'), '1; mode=block');
    assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.ok(res.headers.get('strict-transport-security'));

    server.close();
  });
});
