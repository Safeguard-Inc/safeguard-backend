export interface TransactionRiskFactors {
  amountStroops: bigint | string | number;
  recipientJurisdictionCode?: number;
  isNewRecipient?: boolean;
  isTokenVerified?: boolean;
  velocityBurstCount?: number;
}

export interface RiskScoreResult {
  score: number; // 0 - 100
  band: 'LOW' | 'MEDIUM' | 'HIGH';
  breakdown: {
    amountRisk: number;
    jurisdictionRisk: number;
    velocityRisk: number;
    assetRisk: number;
  };
  reasons: string[];
}

export function calculateRiskScore(factors: TransactionRiskFactors): RiskScoreResult {
  const reasons: string[] = [];
  const amount = typeof factors.amountStroops === 'bigint' ? factors.amountStroops : BigInt(factors.amountStroops || 0);

  // 1. Amount Risk (0 - 30)
  let amountRisk = 2;
  const ONE_HUNDRED_UNITS = 100_0000000n;
  const TEN_THOUSAND_UNITS = 10_000_0000000n;
  const ONE_HUNDRED_THOUSAND_UNITS = 100_000_0000000n;

  if (amount > ONE_HUNDRED_THOUSAND_UNITS) {
    amountRisk = 30;
    reasons.push('High-value transaction exceeding 100,000 units');
  } else if (amount > TEN_THOUSAND_UNITS) {
    amountRisk = 20;
    reasons.push('Elevated transaction amount exceeding 10,000 units');
  } else if (amount > ONE_HUNDRED_UNITS) {
    amountRisk = 10;
  }

  // 2. Jurisdiction Risk (0 - 35)
  let jurisdictionRisk = 0;
  const j = factors.recipientJurisdictionCode;
  if (j === 364 || j === 408) {
    // High-risk / OFAC monitored
    jurisdictionRisk = 35;
    reasons.push('Recipient jurisdiction identified on high-risk monitoring list');
  } else if (j && j !== 840 && j !== 826 && j !== 276 && j !== 250) {
    // Non-domestic / cross-border
    jurisdictionRisk = 12;
    reasons.push('Cross-border international transfer');
  }

  // 3. Velocity Risk (0 - 20)
  let velocityRisk = 0;
  if (factors.velocityBurstCount && factors.velocityBurstCount > 5) {
    velocityRisk = 20;
    reasons.push('High transaction velocity burst detected');
  } else if (factors.isNewRecipient) {
    velocityRisk = 8;
    reasons.push('First-time recipient address');
  }

  // 4. Asset Risk (0 - 15)
  let assetRisk = 2;
  if (factors.isTokenVerified === false) {
    assetRisk = 15;
    reasons.push('Unverified SAC token contract');
  } else {
    assetRisk = 3;
  }

  const rawScore = amountRisk + jurisdictionRisk + velocityRisk + assetRisk;
  const score = Math.min(100, Math.max(0, rawScore));

  let band: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (score >= 70) {
    band = 'HIGH';
  } else if (score >= 30) {
    band = 'MEDIUM';
  }

  return {
    score,
    band,
    breakdown: {
      amountRisk,
      jurisdictionRisk,
      velocityRisk,
      assetRisk,
    },
    reasons,
  };
}
