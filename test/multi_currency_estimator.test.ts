import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MultiCurrencySettlementEstimator,
  type DisbursementItem,
} from '../src/sdk/multiCurrencyEstimator.js';

describe('MultiCurrencySettlementEstimator Unit Tests', () => {
  it('aggregates multi-currency disbursement items accurately', () => {
    const items: DisbursementItem[] = [
      { recipient: 'GALICE1', tokenSymbol: 'USDC', amount: 500_0000000n },
      { recipient: 'GBOB2', tokenSymbol: 'USDC', amount: 1500_0000000n },
      { recipient: 'GCHARLIE3', tokenSymbol: 'XLM', amount: 10000_0000000n },
    ];

    const plan = MultiCurrencySettlementEstimator.estimate(items, {
      USDC: 1.0,
      XLM: 0.12,
    });

    assert.equal(plan.totalDisbursements, 3);
    assert.equal(plan.requirements.length, 2);

    const usdcReq = plan.requirements.find((r) => r.tokenSymbol === 'USDC');
    assert.ok(usdcReq);
    assert.equal(usdcReq.totalAmountStroops, 2000_0000000n);
    assert.equal(usdcReq.recipientCount, 2);
    assert.equal(usdcReq.estimatedUsdCost, 2000);
    // 2% buffer on 2000 is 40
    assert.equal(usdcReq.recommendedBufferStroops, 40_0000000n);

    const xlmReq = plan.requirements.find((r) => r.tokenSymbol === 'XLM');
    assert.ok(xlmReq);
    assert.equal(xlmReq.totalAmountStroops, 10000_0000000n);
    assert.equal(xlmReq.recipientCount, 1);
    // 10,000 * 0.12 = 1,200 USD
    assert.equal(xlmReq.estimatedUsdCost, 1200);

    // Total estimated USD: 2000 + 1200 = 3200
    assert.equal(plan.totalEstimatedUsd, 3200);
  });

  it('evaluates funding adequacy when treasury has full coverage', () => {
    const plan = MultiCurrencySettlementEstimator.estimate([
      { recipient: 'GDEV1', tokenSymbol: 'USDC', amount: 1000_0000000n },
    ]);

    // Available balance: 1050 USDC (needed 1000 + 20 buffer = 1020)
    const evalResult = MultiCurrencySettlementEstimator.evaluateFundingAdequacy(plan, {
      USDC: 1050_0000000n,
    });

    assert.equal(evalResult.funded, true);
    assert.equal(evalResult.deficits.length, 0);
    assert.deepEqual(evalResult.surplusTokens, ['USDC']);
  });

  it('detects deficit when treasury balance is insufficient', () => {
    const plan = MultiCurrencySettlementEstimator.estimate(
      [
        { recipient: 'GDEV1', tokenSymbol: 'EURC', amount: 5000_0000000n },
      ],
      { EURC: 1.08 }
    );

    // Available: 2000 EURC (needed 5000 + 100 buffer = 5100 EURC)
    const evalResult = MultiCurrencySettlementEstimator.evaluateFundingAdequacy(plan, {
      EURC: 2000_0000000n,
    });

    assert.equal(evalResult.funded, false);
    assert.equal(evalResult.deficits.length, 1);
    const deficit = evalResult.deficits[0];
    assert.equal(deficit.tokenSymbol, 'EURC');
    assert.equal(deficit.missingStroops, 3100_0000000n);
    assert.equal(deficit.missingDecimal, '3100.0000000');
    // 3100 * 1.08 = 3348 USD
    assert.equal(deficit.deficitUsd, 3348);
  });
});
