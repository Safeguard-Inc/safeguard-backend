import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateBatchCsvTemplate } from '../src/sdk/batchCsvGenerator';
import { parseTransactionCsv } from '../src/sdk/csvImport';

describe('Batch CSV Template Generator & Round-Trip Tests', () => {
  it('generates compliant payroll CSV template that parses cleanly', () => {
    const csv = generateBatchCsvTemplate({
      type: 'payroll',
      rowCount: 3,
      tokenSymbol: 'XLM',
    });

    assert.ok(csv.startsWith('sender,recipient,token,amount,memo'));
    const parsed = parseTransactionCsv(csv);

    assert.equal(parsed.totalRowsProcessed, 3);
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.valid.length, 3);

    const first = parsed.valid[0];
    assert.equal(first.token, 'XLM');
    assert.equal(first.amount, '2500.0000000');
    assert.equal(first.memo, 'Payroll #EMP-001');
  });

  it('generates vendor payout template with custom sender and token', () => {
    const customSender = 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT';
    const csv = generateBatchCsvTemplate({
      type: 'vendor_payout',
      rowCount: 2,
      tokenSymbol: 'USDC',
      senderAddress: customSender,
    });

    const parsed = parseTransactionCsv(csv);
    assert.equal(parsed.valid.length, 2);
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.valid[0].sender, customSender);
    assert.equal(parsed.valid[0].token, 'USDC');
    assert.equal(parsed.valid[0].memo, 'INV-2026-01');
  });

  it('generates dividend template without memos when requested', () => {
    const csv = generateBatchCsvTemplate({
      type: 'dividend_distribution',
      rowCount: 2,
      includeMemos: false,
    });

    assert.ok(!csv.includes(',memo'));
    const parsed = parseTransactionCsv(csv);
    assert.equal(parsed.valid.length, 2);
    assert.equal(parsed.valid[0].memo, undefined);
  });
});
