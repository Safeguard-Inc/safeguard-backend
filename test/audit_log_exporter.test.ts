import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuditLogStreamExporter, AuditEvent } from '../src/sdk/auditLogExporter';
import { StoredTransaction } from '../src/server/store';

describe('AuditLogStreamExporter Unit Tests', () => {
  const sampleEvents: AuditEvent[] = [
    {
      '@timestamp': '2026-03-31T12:00:00.000Z',
      event_id: 'evt-001',
      category: 'payment',
      action: 'transfer_settle',
      actor: 'GB_SENDER_1',
      resource: 'GB_RECIPIENT_1',
      status: 'SUCCESS',
      details: { token: 'XLM', amount: '100000000' },
      integrity_hash: 'aabbcc112233',
    },
    {
      '@timestamp': '2026-03-31T12:01:00.000Z',
      event_id: 'evt-002',
      category: 'compliance',
      action: 'sanctions_block',
      actor: 'GB_SENDER_2',
      resource: 'GB_RECIPIENT_2',
      status: 'DENIED',
      details: { ruleId: 'SANCTIONS-001', reason: 'High-risk jurisdiction' },
      integrity_hash: 'ddeeff445566',
    },
  ];

  it('formats and parses NDJSON round-trip cleanly', () => {
    const ndjson = AuditLogStreamExporter.toNdjson(sampleEvents);
    assert.ok(ndjson.includes('\n'));
    assert.equal(ndjson.split('\n').filter((l) => l.trim().length > 0).length, 2);

    const parsed = AuditLogStreamExporter.parseNdjson(ndjson);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].event_id, 'evt-001');
    assert.equal(parsed[0].action, 'transfer_settle');
    assert.equal(parsed[1].status, 'DENIED');
  });

  it('handles empty events and blank lines in NDJSON', () => {
    assert.equal(AuditLogStreamExporter.toNdjson([]), '');
    assert.deepEqual(AuditLogStreamExporter.parseNdjson(''), []);
    assert.deepEqual(AuditLogStreamExporter.parseNdjson('\n  \n\n'), []);
  });

  it('computes deterministic SHA-256 integrity hash for audit events', () => {
    const eventWithoutHash = {
      '@timestamp': '2026-03-31T12:00:00.000Z',
      event_id: 'evt-test',
      category: 'policy' as const,
      action: 'rule_evaluate',
      actor: 'GA_ADMIN',
      resource: 'POLICY_INST_01',
      status: 'SUCCESS' as const,
      details: { version: 1 },
    };

    const hash1 = AuditLogStreamExporter.computeIntegrityHash(eventWithoutHash);
    const hash2 = AuditLogStreamExporter.computeIntegrityHash(eventWithoutHash);
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64); // SHA-256 hex string

    const signed = AuditLogStreamExporter.signEvents([eventWithoutHash]);
    assert.equal(signed[0].integrity_hash, hash1);
  });

  it('formats RFC 5424 Syslog stream with structured data', () => {
    const syslog = AuditLogStreamExporter.toSyslogRfc5424(sampleEvents, 'safeguard-engine', 'node-01');
    const lines = syslog.split('\n');
    assert.equal(lines.length, 2);

    // Line 1 (SUCCESS -> PRI 14)
    assert.ok(lines[0].startsWith('<14>1 2026-03-31T12:00:00.000Z node-01 safeguard-engine'));
    assert.ok(lines[0].includes('[safeguard@43210 category="payment" action="transfer_settle"'));
    assert.ok(lines[0].includes('evt-001'));

    // Line 2 (DENIED -> PRI 12)
    assert.ok(lines[1].startsWith('<12>1 2026-03-31T12:01:00.000Z node-01 safeguard-engine'));
    assert.ok(lines[1].includes('[safeguard@43210 category="compliance" action="sanctions_block"'));
    assert.ok(lines[1].includes('evt-002'));
  });

  it('converts stored transactions into signed audit events', () => {
    const txs: StoredTransaction[] = [
      {
        id: 'tx-100',
        sender: 'GC_SENDER',
        recipient: 'GA_RECIPIENT',
        token: 'XLM',
        amount: '5000000',
        status: 'Approved',
        reason: 'Clean transfer',
        timestamp: 1770000000000,
        txHash: '0xabc123',
        ledger: 12345,
      },
      {
        id: 'tx-101',
        sender: 'GC_BAD_ACTOR',
        recipient: 'GA_RECIPIENT',
        token: 'USDC',
        amount: '1000000',
        status: 'Blocked',
        reason: 'Denylisted address',
        timestamp: 1770000001000,
      },
    ];

    const events = AuditLogStreamExporter.fromTransactions(txs);
    assert.equal(events.length, 2);
    assert.equal(events[0].event_id, 'tx-100');
    assert.equal(events[0].status, 'SUCCESS');
    assert.ok(events[0].integrity_hash);

    assert.equal(events[1].event_id, 'tx-101');
    assert.equal(events[1].status, 'DENIED');
    assert.ok(events[1].integrity_hash);
  });
});
