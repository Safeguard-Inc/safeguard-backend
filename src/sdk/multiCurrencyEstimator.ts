/**
 * multiCurrencyEstimator.ts
 *
 * Enterprise treasury helper for calculating multi-token aggregate disbursement requirements,
 * fee buffers, and liquidity coverage across Stellar Asset Contracts (SAC).
 */

export interface DisbursementItem {
  recipient: string;
  tokenSymbol: string;
  amount: bigint | string;
}

export interface CurrencySettlementRequirement {
  tokenSymbol: string;
  totalAmountStroops: bigint;
  totalAmountDecimal: string;
  recipientCount: number;
  unitPriceUsd: number;
  estimatedUsdCost: number;
  recommendedBufferStroops: bigint; // 2% liquidity buffer for fees and slippage
}

export interface MultiCurrencySettlementPlan {
  totalDisbursements: number;
  totalEstimatedUsd: number;
  requirements: CurrencySettlementRequirement[];
  generatedAt: number;
}

export interface DeficitItem {
  tokenSymbol: string;
  missingStroops: bigint;
  missingDecimal: string;
  deficitUsd: number;
}

export interface FundingAdequacyEvaluation {
  funded: boolean;
  deficits: DeficitItem[];
  surplusTokens: string[];
}

const DEFAULT_PRICES: Record<string, number> = {
  USDC: 1.0,
  PYUSD: 1.0,
  EURC: 1.08,
  XLM: 0.12,
};

export class MultiCurrencySettlementEstimator {
  public static stroopsToDecimal(stroops: bigint, decimals: number = 7): string {
    const divisor = 10n ** BigInt(decimals);
    const intPart = stroops / divisor;
    const frac = stroops % divisor;
    return `${intPart}.${frac.toString().padStart(decimals, '0')}`;
  }

  /**
   * Aggregates disbursements by token and computes total requirements and USD valuation.
   */
  public static estimate(
    items: DisbursementItem[],
    priceOverrides: Record<string, number> = {}
  ): MultiCurrencySettlementPlan {
    const tokenMap = new Map<string, { totalStroops: bigint; count: number }>();

    for (const item of items) {
      const sym = (item.tokenSymbol || 'XLM').toUpperCase();
      const amt = BigInt(item.amount);
      const curr = tokenMap.get(sym) || { totalStroops: 0n, count: 0 };
      curr.totalStroops += amt;
      curr.count += 1;
      tokenMap.set(sym, curr);
    }

    let totalEstimatedUsd = 0;
    const requirements: CurrencySettlementRequirement[] = [];

    for (const [sym, agg] of tokenMap.entries()) {
      const unitPrice = priceOverrides[sym] ?? DEFAULT_PRICES[sym] ?? 1.0;
      const dec = Number(agg.totalStroops) / 10_000_000;
      const estUsd = Math.round(dec * unitPrice * 100) / 100;
      totalEstimatedUsd += estUsd;

      // 2% liquidity buffer
      const buffer = (agg.totalStroops * 2n) / 100n;

      requirements.push({
        tokenSymbol: sym,
        totalAmountStroops: agg.totalStroops,
        totalAmountDecimal: MultiCurrencySettlementEstimator.stroopsToDecimal(agg.totalStroops, 7),
        recipientCount: agg.count,
        unitPriceUsd: unitPrice,
        estimatedUsdCost: estUsd,
        recommendedBufferStroops: buffer,
      });
    }

    return {
      totalDisbursements: items.length,
      totalEstimatedUsd: Math.round(totalEstimatedUsd * 100) / 100,
      requirements,
      generatedAt: Date.now(),
    };
  }

  /**
   * Compares plan requirements with available treasury balances to identify shortfalls.
   */
  public static evaluateFundingAdequacy(
    plan: MultiCurrencySettlementPlan,
    availableBalances: Record<string, bigint | string>
  ): FundingAdequacyEvaluation {
    const deficits: DeficitItem[] = [];
    const surplusTokens: string[] = [];

    for (const req of plan.requirements) {
      const rawBal = availableBalances[req.tokenSymbol] ?? availableBalances[req.tokenSymbol.toLowerCase()] ?? 0n;
      const available = BigInt(rawBal);
      const neededWithBuffer = req.totalAmountStroops + req.recommendedBufferStroops;

      if (available < neededWithBuffer) {
        const missing = neededWithBuffer - available;
        const missingDec = Number(missing) / 10_000_000;
        const deficitUsd = Math.round(missingDec * req.unitPriceUsd * 100) / 100;

        deficits.push({
          tokenSymbol: req.tokenSymbol,
          missingStroops: missing,
          missingDecimal: MultiCurrencySettlementEstimator.stroopsToDecimal(missing, 7),
          deficitUsd,
        });
      } else {
        surplusTokens.push(req.tokenSymbol);
      }
    }

    return {
      funded: deficits.length === 0,
      deficits,
      surplusTokens,
    };
  }
}
