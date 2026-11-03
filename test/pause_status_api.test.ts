import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../src/server/app';
import { SafeguardClient } from '../src/sdk/client';

describe('Emergency Pause Status API Endpoint Tests', () => {
  it('GET /api/compliance/pause-status returns normal operational status by default', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/compliance/pause-status`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.isPaused, false);
      assert.equal(json.data.circuitBreakerState, 'NORMAL_OPERATIONAL');
      assert.equal(json.data.remainingSeconds, 0);
    } finally {
      server.close();
    }
  });

  it('GET /api/compliance/pause-status calculates timelock remaining correctly with query overrides', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const futureEpoch = Math.floor(Date.now() / 1000) + 1200; // 20 mins in future
      const res = await fetch(
        `http://127.0.0.1:${port}/api/compliance/pause-status?isPaused=true&pausedUntil=${futureEpoch}&pausedBy=GGUARDIAN123`
      );
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.isPaused, true);
      assert.equal(json.data.circuitBreakerState, 'TIMELOCKED_PAUSED');
      assert.equal(json.data.pausedBy, 'GGUARDIAN123');
      assert.ok(json.data.remainingSeconds > 1150);
      assert.ok(json.data.autoResumeAt !== null);
    } finally {
      server.close();
    }
  });

  it('POST /api/compliance/pause-status/simulate triggers and clears emergency circuit breaker', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      // 1. Engage 600s emergency pause
      const engageRes = await fetch(`http://127.0.0.1:${port}/api/compliance/pause-status/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaused: true, durationSeconds: 600, caller: 'GADMIN_SIMULATOR' }),
      });
      assert.equal(engageRes.status, 200);
      const engageJson = await engageRes.json();
      assert.equal(engageJson.success, true);
      assert.equal(engageJson.data.isPaused, true);
      assert.equal(engageJson.data.circuitBreakerState, 'TIMELOCKED_PAUSED');
      assert.ok(engageJson.data.remainingSeconds > 580);

      // 2. Query endpoint directly confirms engaged state
      const checkRes = await fetch(`http://127.0.0.1:${port}/api/compliance/pause-status`);
      const checkJson = await checkRes.json();
      assert.equal(checkJson.data.isPaused, true);
      assert.equal(checkJson.data.pausedBy, 'GADMIN_SIMULATOR');

      // 3. Clear pause
      const clearRes = await fetch(`http://127.0.0.1:${port}/api/compliance/pause-status/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaused: false }),
      });
      assert.equal(clearRes.status, 200);
      const clearJson = await clearRes.json();
      assert.equal(clearJson.data.isPaused, false);
      assert.equal(clearJson.data.circuitBreakerState, 'NORMAL_OPERATIONAL');
    } finally {
      server.close();
    }
  });
});
