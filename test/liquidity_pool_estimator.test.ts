import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LiquidityPoolEstimator } from '../src/sdk/liquidityPoolEstimator';

describe('LiquidityPoolEstimator Unit Tests', () => {
  it('estimates swap output, fees, and minimum output accurately', () => {
    // 1,000,000 XLM reserveIn, 125,000 USDC reserveOut.
    // Swap 10,000 XLM.
    const reserveIn = 1_000_000_0000000n;
    const reserveOut = 125_000_0000000n;
    const amountIn = 10_000_0000000n;

    const res = LiquidityPoolEstimator.estimateSwap(amountIn, reserveIn, reserveOut, 30, 50);

    assert.ok(res.amountOut > 0n);
    assert.ok(res.minimumAmountOut < res.amountOut);
    assert.equal(res.feeAmount, (amountIn * 30n) / 10000n);
    assert.ok(res.priceImpactBps > 0 && res.priceImpactBps < 1000);
    assert.ok(res.effectivePrice > 0);
  });

  it('handles zero or negative inputs safely without panicking', () => {
    const zeroIn = LiquidityPoolEstimator.estimateSwap(0n, 1000n, 1000n);
    assert.equal(zeroIn.amountOut, 0n);
    assert.equal(zeroIn.minimumAmountOut, 0n);

    const zeroReserves = LiquidityPoolEstimator.estimateSwap(100n, 0n, 1000n);
    assert.equal(zeroReserves.amountOut, 0n);
  });

  it('formats reserve ratios cleanly', () => {
    const ratio = LiquidityPoolEstimator.formatReserveRatio(
      1_000_000n,
      'XLM',
      125_000n,
      'USDC'
    );
    assert.equal(ratio, '1 XLM = 0.1250 USDC');

    const empty = LiquidityPoolEstimator.formatReserveRatio(0n, 'XLM', 100n, 'USDC');
    assert.equal(empty, '1 XLM = 0.00 USDC');
  });

  it('evaluates slippage acceptability thresholds', () => {
    assert.equal(LiquidityPoolEstimator.isSlippageAcceptable(1000n, 990n), true);
    assert.equal(LiquidityPoolEstimator.isSlippageAcceptable(1000n, 1000n), true);
    assert.equal(LiquidityPoolEstimator.isSlippageAcceptable(950n, 990n), false);
  });
});
