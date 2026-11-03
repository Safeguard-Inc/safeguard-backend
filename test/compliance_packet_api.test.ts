import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../src/server/app';
import { SafeguardClient } from '../src/sdk/client';
import { RegulatoryCompliancePacketExporter } from '../src/sdk/compliancePacketExporter';

describe('Regulatory Compliance Packet Export API Endpoint Tests', () => {
  it('GET /api/export/compliance-packet returns valid sealed packet by default', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/export/compliance-packet?institution=TrustSecFin`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.packet);
      assert.equal(json.packet.manifest.institutionName, 'TrustSecFin');
      assert.ok(json.packet.masterPacketSeal.length === 64);
      assert.equal(RegulatoryCompliancePacketExporter.verifyIntegrity(json.packet), true);
    } finally {
      server.close();
    }
  });

  it('GET /api/export/compliance-packet?format=markdown returns markdown document', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/export/compliance-packet?format=markdown&institution=BafinClearing`);
      assert.equal(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('text/markdown'));

      const text = await res.text();
      assert.ok(text.includes('Institutional Regulatory Compliance Proof Packet'));
      assert.ok(text.includes('BafinClearing'));
      assert.ok(text.includes('Compliance Verdict & AML Screening'));
    } finally {
      server.close();
    }
  });

  it('GET /api/export/compliance-packet?download=true sets Content-Disposition header', async () => {
    const client = new SafeguardClient();
    const app = createApp(client);
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/export/compliance-packet?download=true`);
      assert.equal(res.status, 200);
      const disposition = res.headers.get('content-disposition');
      assert.ok(disposition);
      assert.ok(disposition.includes('attachment; filename="safeguard-compliance-packet-'));
    } finally {
      server.close();
    }
  });
});
