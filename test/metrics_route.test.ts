import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server/app.js';
import { metricsCollector } from '../src/server/metrics.js';

describe('Prometheus Metrics Exporter Route Tests', () => {
  test('GET /metrics returns standard OpenMetrics plain text payload', async () => {
    metricsCollector.recordSimulation('APPROVE');
    metricsCollector.recordSimulation('FLAG');
    metricsCollector.recordRequest('GET', 200);

    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/metrics`);
      assert.equal(res.status, 200);

      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('text/plain'));
      assert.ok(contentType.includes('version=0.0.4'));

      const body = await res.text();
      assert.ok(body.includes('# HELP safeguard_http_requests_total'));
      assert.ok(body.includes('# TYPE safeguard_http_requests_total counter'));
      assert.ok(body.includes('safeguard_simulations_total{decision="APPROVE"}'));
      assert.ok(body.includes('safeguard_simulations_total{decision="FLAG"}'));
      assert.ok(body.includes('safeguard_compliance_transactions_total{status="approved"}'));
      assert.ok(body.includes('safeguard_escrows_active'));
      assert.ok(body.includes('safeguard_compliance_approval_ratio'));
      assert.ok(body.includes('safeguard_process_uptime_seconds'));
    } finally {
      server.close();
    }
  });
});
