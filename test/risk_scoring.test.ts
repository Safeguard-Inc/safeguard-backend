import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRiskScore } from '../src/sdk/riskScoring.ts';

describe('Transaction Composite Risk Scoring Engine Tests', () => {
  test('scores standard domestic payment as LOW risk', () => {
    const res = calculateRiskScore({
      amountStroops: 50_0000000n, // 50 units
      recipientJurisdictionCode: 840, // US
      isNewRecipient: false,
      isTokenVerified: true,
    });

    assert.equal(res.band, 'LOW');
    assert.ok(res.score < 30);
    assert.equal(res.breakdown.jurisdictionRisk, 0);
  });

  test('scores high-value cross-border payment to high-risk region as HIGH risk', () => {
    const res = calculateRiskScore({
      amountStroops: 250_000_0000000n, // 250,000 units
      recipientJurisdictionCode: 364, // Iran (sanctioned/monitored)
      isNewRecipient: true,
      isTokenVerified: true,
    });

    assert.equal(res.band, 'HIGH');
    assert.ok(res.score >= 70);
    assert.equal(res.breakdown.amountRisk, 30);
    assert.equal(res.breakdown.jurisdictionRisk, 35);
    assert.ok(res.reasons.some((r) => r.includes('high-risk monitoring list')));
  });

  test('scores burst velocity and unverified token with elevated points', () => {
    const res = calculateRiskScore({
      amountStroops: 500_0000000n,
      recipientJurisdictionCode: 840,
      velocityBurstCount: 10,
      isTokenVerified: false,
    });

    assert.equal(res.band, 'MEDIUM');
    assert.equal(res.breakdown.velocityRisk, 20);
    assert.equal(res.breakdown.assetRisk, 15);
    assert.ok(res.reasons.some((r) => r.includes('velocity burst')));
    assert.ok(res.reasons.some((r) => r.includes('Unverified SAC token')));
  });
});
