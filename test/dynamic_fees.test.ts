import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SafeguardClient } from '../src/sdk/client.js';

describe('SafeguardClient Dynamic Fee Estimation Tests', () => {
  const client = new SafeguardClient();

  test('calculates normal tier fee for direct transfer correctly', () => {
    // 50 XLM (under 100 XLM spend cap)
    const estimate = client.calculateDynamicFeeEstimate(500000000n, 'normal');

    assert.equal(estimate.tier, 'normal');
    assert.equal(estimate.isEscrow, false);
    assert.equal(estimate.baseFeeStroops, 200);
    assert.equal(estimate.resourceFeeStroops, 19137);
    assert.equal(estimate.totalEstimatedFeeStroops, 19337);
    assert.equal(estimate.totalEstimatedFeeXlm, '0.0019337');
  });

  test('calculates priority tier fee for escrow routing with surge base fee', () => {
    // 150 XLM (exceeds 100 XLM spend cap)
    const estimate = client.calculateDynamicFeeEstimate(1500000000n, 'priority');

    assert.equal(estimate.tier, 'priority');
    assert.equal(estimate.isEscrow, true);
    assert.equal(estimate.baseFeeStroops, 1000);
    assert.equal(estimate.resourceFeeStroops, 739209);
    assert.equal(estimate.totalEstimatedFeeStroops, 740209);
    assert.equal(estimate.totalEstimatedFeeXlm, '0.0740209');
  });

  test('allows custom base fee override', () => {
    const estimate = client.calculateDynamicFeeEstimate(500000000n, 'low', 500);

    assert.equal(estimate.baseFeeStroops, 500);
    assert.equal(estimate.resourceFeeStroops, 19137);
    assert.equal(estimate.totalEstimatedFeeStroops, 19637);
  });
});
