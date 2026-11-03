import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {
  createStructuredLogger,
  StructuredLog,
} from '../src/server/middleware/logger.js';

describe('Structured JSON Logging Middleware Tests', () => {
  test('invokes custom writer with structured log payload on request completion', async () => {
    const logs: StructuredLog[] = [];
    const app = express();

    app.use(createStructuredLogger((entry) => logs.push(entry)));

    app.get('/test/logging', (req, res) => {
      res.setHeader('x-request-id', 'test-req-123');
      res.status(200).json({ status: 'ok' });
    });

    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/test/logging`, {
        headers: {
          'x-request-id': 'custom-client-id-456',
          'user-agent': 'TestRunner/1.0',
        },
      });

      assert.equal(res.status, 200);

      // Give event loop tick for finish event
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.equal(logs.length, 1);
      const log = logs[0];

      assert.equal(log.method, 'GET');
      assert.equal(log.path, '/test/logging');
      assert.equal(log.statusCode, 200);
      assert.equal(log.requestId, 'custom-client-id-456');
      assert.equal(log.userAgent, 'TestRunner/1.0');
      assert.ok(typeof log.durationMs === 'number' && log.durationMs >= 0);
      assert.ok(!isNaN(Date.parse(log.timestamp)));
    } finally {
      server.close();
    }
  });

  test('captures generated or response requestId when none sent in request', async () => {
    const logs: StructuredLog[] = [];
    const app = express();

    app.use(createStructuredLogger((entry) => logs.push(entry)));

    app.get('/test/auto-id', (req, res) => {
      res.setHeader('x-request-id', 'server-generated-id');
      res.status(204).end();
    });

    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/test/auto-id`);
      assert.equal(res.status, 204);

      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.equal(logs.length, 1);
      assert.equal(logs[0].requestId, 'server-generated-id');
      assert.equal(logs[0].statusCode, 204);
    } finally {
      server.close();
    }
  });
});
