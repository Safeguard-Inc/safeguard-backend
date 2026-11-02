import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SafeguardClient } from '../src/sdk/client.js';

describe('SafeguardClient SDK Helpers Tests', () => {
  const client = new SafeguardClient();

  test('isAddressCompliant correctly validates clean vs denylisted accounts', () => {
    client.setDenylist(['GBADADDRESS123']);
    assert.equal(client.isAddressCompliant('GCLEANADDRESS456'), true);
    assert.equal(client.isAddressCompliant('GBADADDRESS123'), false);
  });

  test('estimatePaymentFee returns direct transfer fee vs escrow rent fee', () => {
    // 50 XLM = 500,000,000 stroops (under 100 XLM cap)
    const directFee = client.estimatePaymentFee(500_000_000n);
    assert.equal(directFee, 19237);

    // 150 XLM = 1,500,000,000 stroops (over 100 XLM cap)
    const escrowFee = client.estimatePaymentFee(1_500_000_000n);
    assert.equal(escrowFee, 739309);
  });

  test('getPolicySummary returns active spend cap and denylist count', () => {
    client.setDenylist(['ADDR1', 'ADDR2']);
    const summary = client.getPolicySummary();
    assert.equal(summary.denylistedCount, 2);
    assert.equal(summary.spendCapStroops, '1000000000');
    assert.ok(summary.paymentContractId.length > 10);
  });
});
