import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SafeguardClient } from '../src/sdk/client.js';
import { PaymentParams } from '../src/sdk/types.js';

describe('SafeguardClient Batch Payment Parameter Validation Tests', () => {
  const client = new SafeguardClient();

  const validPayment1: PaymentParams = {
    sender: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    recipient: 'GCXKG6RN4ONIEPCMNFB732A436Z5PNDSRLGHD7UYWU7JZX2TM7GXM5YF',
    token: 'CAS3J7GYLGXMF6TDJBBYYSE3VBMNOU345TLRMQPO2SL7PGBZ6YZZIFEX',
    amount: '10000000',
  };

  const validPayment2: PaymentParams = {
    sender: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    recipient: 'GB222222222222222222222222222222222222222222222222222222',
    token: 'CAS3J7GYLGXMF6TDJBBYYSE3VBMNOU345TLRMQPO2SL7PGBZ6YZZIFEX',
    amount: '50000000',
    memo: { type: 'text', value: 'Invoice #999' },
  };

  it('approves batch where all payments are fully valid', () => {
    const result = client.validateBatchPayments([validPayment1, validPayment2]);
    assert.equal(result.valid, true);
    assert.equal(result.totalPayments, 2);
    assert.equal(result.validCount, 2);
    assert.equal(result.invalidCount, 0);
    assert.equal(result.errorsByIndex.length, 0);
  });

  it('detects and indexes invalid payments within a mixed batch', () => {
    const invalidPaymentZeroAmount: PaymentParams = {
      sender: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      recipient: 'GCXKG6RN4ONIEPCMNFB732A436Z5PNDSRLGHD7UYWU7JZX2TM7GXM5YF',
      token: 'CAS3J7GYLGXMF6TDJBBYYSE3VBMNOU345TLRMQPO2SL7PGBZ6YZZIFEX',
      amount: '0',
    };

    const invalidPaymentMissingToken: PaymentParams = {
      sender: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      recipient: 'GCXKG6RN4ONIEPCMNFB732A436Z5PNDSRLGHD7UYWU7JZX2TM7GXM5YF',
      token: '',
      amount: '10000000',
    };

    const batch = [
      validPayment1,
      invalidPaymentZeroAmount,
      validPayment2,
      invalidPaymentMissingToken,
    ];

    const result = client.validateBatchPayments(batch);
    assert.equal(result.valid, false);
    assert.equal(result.totalPayments, 4);
    assert.equal(result.validCount, 2);
    assert.equal(result.invalidCount, 2);
    assert.equal(result.errorsByIndex.length, 2);

    assert.equal(result.errorsByIndex[0].index, 1);
    assert.ok(
      result.errorsByIndex[0].errors.some((e) => e.includes('positive'))
    );

    assert.equal(result.errorsByIndex[1].index, 3);
    assert.ok(
      result.errorsByIndex[1].errors.some((e) => e.includes('Token address'))
    );
  });

  it('handles empty batch gracefully', () => {
    const result = client.validateBatchPayments([]);
    assert.equal(result.valid, true);
    assert.equal(result.totalPayments, 0);
    assert.equal(result.validCount, 0);
    assert.equal(result.invalidCount, 0);
    assert.equal(result.errorsByIndex.length, 0);
  });
});
