import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCsvField,
  serializeReceiptCsv,
  serializeReceiptJson,
} from '../src/sdk/receipt.js';
import { TransactionReceipt } from '../src/sdk/types.js';

describe('Transaction Receipt Serializer Tests', () => {
  const sampleReceipts: TransactionReceipt[] = [
    {
      id: 'tx-101',
      sender: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      recipient: 'GCXKG6RN4ONIEPCMNFB732A436Z5PNDSRLGHD7UYWU7JZX2TM7GXM5YF',
      token: 'CAS3J7GYLGXMF6TDJBBYYSE3VBMNOU345TLRMQPO2SL7PGBZ6YZZIFEX',
      amount: '50000000',
      status: 'Approved',
      reason: 'Standard payment, within limit',
      timestamp: 1700000000000,
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      ledger: 4951234,
    },
    {
      id: 'tx-102',
      sender: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      recipient: 'GB222222222222222222222222222222222222222222222222222222',
      token: 'CAS3J7GYLGXMF6TDJBBYYSE3VBMNOU345TLRMQPO2SL7PGBZ6YZZIFEX',
      amount: '150000000',
      status: 'Escrowed',
      reason: 'Exceeds spend cap: routed to escrow #42',
      timestamp: 1700000060000,
      txHash: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ledger: 4951236,
    },
  ];

  it('escapes CSV fields with commas, quotes, and newlines', () => {
    assert.equal(formatCsvField('hello'), 'hello');
    assert.equal(formatCsvField(null), '');
    assert.equal(formatCsvField(undefined), '');
    assert.equal(formatCsvField('hello,world'), '"hello,world"');
    assert.equal(formatCsvField('quote "here"'), '"quote ""here"""');
    assert.equal(formatCsvField('line\nbreak'), '"line\nbreak"');
  });

  it('serializes transaction receipts to RFC 4180 CSV with default headers', () => {
    const csv = serializeReceiptCsv(sampleReceipts);
    const lines = csv.split('\r\n');

    assert.equal(lines.length, 3);
    assert.equal(
      lines[0],
      'id,timestamp,sender,recipient,token,amount,status,reason,txHash,ledger'
    );
    assert.ok(lines[1].startsWith('tx-101,'));
    assert.ok(lines[1].includes('"Standard payment, within limit"'));
    assert.ok(lines[2].startsWith('tx-102,'));
  });

  it('serializes receipts to CSV with custom delimiter and without headers', () => {
    const csv = serializeReceiptCsv(sampleReceipts, {
      includeHeaders: false,
      delimiter: ';',
    });
    const lines = csv.split('\r\n');

    assert.equal(lines.length, 2);
    assert.ok(lines[0].startsWith('tx-101;'));
    assert.ok(lines[1].startsWith('tx-102;'));
  });

  it('serializes receipts to JSON string format (pretty and compact)', () => {
    const prettyJson = serializeReceiptJson(sampleReceipts, true);
    const compactJson = serializeReceiptJson(sampleReceipts, false);

    const parsedPretty = JSON.parse(prettyJson);
    const parsedCompact = JSON.parse(compactJson);

    assert.equal(parsedPretty.length, 2);
    assert.equal(parsedCompact.length, 2);
    assert.equal(parsedPretty[0].id, 'tx-101');
    assert.ok(prettyJson.includes('\n'));
    assert.ok(!compactJson.includes('\n'));
  });
});
