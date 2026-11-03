/**
 * liquidityPoolEstimator.ts
 *
 * Constant Product AMM (x * y = k) estimator for Soroban decentralized exchange
 * and liquidity pool routing calculations.
 */

export interface PoolReserves {
  reserveIn: bigint;
  reserveOut: bigint;
  feeBps?: number;
}

export interface SwapEstimation {
  amountIn: bigint;
  amountOut: bigint;
  minimumAmountOut: bigint;
  feeAmount: bigint;
  priceImpactBps: number;
  effectivePrice: number;
}

export class LiquidityPoolEstimator {
  /**
   * Estimates swap output amount, fees, price impact, and slippage protection
   * using standard Constant Product AMM formula with basis-point fee deduction.
   */
  public static estimateSwap(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    feeBps: number = 30, // 0.3% standard Soroban pool fee
    slippageToleranceBps: number = 50 // 0.5% standard slippage tolerance
  ): SwapEstimation {
    if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) {
      return {
        amountIn,
        amountOut: 0n,
        minimumAmountOut: 0n,
        feeAmount: 0n,
        priceImpactBps: 0,
        effectivePrice: 0,
      };
    }

    const feeMultiplier = 10000n - BigInt(feeBps);
    const amountInWithFee = amountIn * feeMultiplier;
    const feeAmount = (amountIn * BigInt(feeBps)) / 10000n;

    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 10000n + amountInWithFee;
    const amountOut = numerator / denominator;

    // Minimum amount out considering slippage tolerance
    const slippageMultiplier = 10000n - BigInt(slippageToleranceBps);
    const minimumAmountOut = (amountOut * slippageMultiplier) / 10000n;

    // Price impact in basis points (approximate percentage of reserve shifted)
    const impactBps = Number((amountIn * 10000n) / (reserveIn + amountIn));

    // Effective price = amountOut / amountIn
    const effectivePrice = amountIn > 0n ? Number(amountOut) / Number(amountIn) : 0;

    return {
      amountIn,
      amountOut,
      minimumAmountOut,
      feeAmount,
      priceImpactBps: Math.min(10000, impactBps),
      effectivePrice,
    };
  }

  /**
   * Formats reserve ratio string for telemetry displays (e.g. "1 XLM = 0.125 USDC").
   */
  public static formatReserveRatio(
    reserveA: bigint,
    symbolA: string,
    reserveB: bigint,
    symbolB: string
  ): string {
    if (reserveA <= 0n || reserveB <= 0n) {
      return `1 ${symbolA} = 0.00 ${symbolB}`;
    }
    const ratio = Number(reserveB) / Number(reserveA);
    return `1 ${symbolA} = ${ratio.toFixed(4)} ${symbolB}`;
  }

  /**
   * Checks whether the swap output fulfills the slippage requirement.
   */
  public static isSlippageAcceptable(receivedAmount: bigint, minimumExpected: bigint): boolean {
    return receivedAmount >= minimumExpected;
  }
}
