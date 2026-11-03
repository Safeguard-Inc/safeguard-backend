import { NetworkConfig, PaymentParams, SimulationResult, TESTNET_CONFIG, TokenMetadata, KNOWN_SAC_TOKENS, StellarMemo, FeeTier, FeeEstimate, BatchValidationError, BatchValidationResult } from './types.js';
import { decodeErrorCode, DecodedError } from './errors.js';

export class SafeguardClient {
  private config: NetworkConfig;
  private denylist: Set<string> = new Set();
  private spendCap: bigint = 100_0000000n; // 100 units: matches the live Testnet deployment (7 decimals)
  private simCache: Map<string, { result: SimulationResult; expiresAt: number }> = new Map();
  private cacheTtlMs: number = 5000;

  constructor(config: Partial<NetworkConfig> = {}) {
    this.config = { ...TESTNET_CONFIG, ...config };
  }

  /**
   * Set local denylist simulation mirror.
   */
  public setDenylist(addresses: string[]): void {
    this.denylist = new Set(addresses.map((a) => a.trim().toUpperCase()));
  }

  private jurisdictions: Map<string, number> = new Map();

  public setJurisdictions(entries: Array<{ address: string; jurisdiction: number }>): void {
    for (const e of entries) {
      this.jurisdictions.set(e.address.trim().toUpperCase(), e.jurisdiction);
    }
  }

  public getJurisdiction(address: string): number | undefined {
    return this.jurisdictions.get(address.trim().toUpperCase());
  }

  public checkJurisdictionBatch(addresses: string[]): Array<{ address: string; jurisdiction?: number; isDomestic: boolean }> {
    return addresses.map((addr) => {
      const j = this.getJurisdiction(addr);
      return {
        address: addr,
        jurisdiction: j,
        isDomestic: j === 1 || j === 840,
      };
    });
  }

  public checkDenylistBatch(addresses: string[]): Array<{ address: string; isDenylisted: boolean }> {
    return addresses.map((addr) => ({
      address: addr,
      isDenylisted: this.isDenylisted(addr),
    }));
  }

  public addToDenylist(addresses: string[]): void {
    for (const addr of addresses) {
      this.denylist.add(addr.trim().toUpperCase());
    }
  }

  public removeFromDenylist(addresses: string[]): void {
    for (const addr of addresses) {
      this.denylist.delete(addr.trim().toUpperCase());
    }
  }

  public isDenylisted(address: string): boolean {
    return this.denylist.has(address.trim().toUpperCase());
  }

  /**
   * Set local spend cap simulation mirror.
   */
  public setSpendCap(cap: string): void {
    this.spendCap = BigInt(cap);
  }

  /**
   * Validate Stellar payment memo format and bounds.
   */
  public validateMemo(memo?: StellarMemo): { valid: boolean; error?: string } {
    if (!memo || memo.type === 'none' || !memo.value) {
      return { valid: true };
    }
    const val = memo.value.trim();
    switch (memo.type) {
      case 'text': {
        const byteLen = Buffer.byteLength(val, 'utf8');
        if (byteLen > 28) {
          return { valid: false, error: `MEMO_TEXT exceeds 28 bytes (received ${byteLen} bytes)` };
        }
        return { valid: true };
      }
      case 'id': {
        if (!/^\d+$/.test(val)) {
          return { valid: false, error: 'MEMO_ID must be an unsigned 64-bit integer string' };
        }
        try {
          const id = BigInt(val);
          if (id < 0n || id > 18446744073709551615n) {
            return { valid: false, error: 'MEMO_ID exceeds u64 bounds (0 - 18446744073709551615)' };
          }
        } catch {
          return { valid: false, error: 'MEMO_ID could not be parsed as a 64-bit integer' };
        }
        return { valid: true };
      }
      case 'hash':
      case 'return': {
        if (!/^[0-9a-fA-F]{64}$/.test(val)) {
          return { valid: false, error: `MEMO_${memo.type.toUpperCase()} must be a 32-byte hex string (64 hex chars)` };
        }
        return { valid: true };
      }
      default:
        return { valid: false, error: `Unsupported memo type: ${(memo as any).type}` };
    }
  }

  /**
   * Simulate a payment against policy rules.
   * Performs zero-broadcast pre-flight evaluation with optional caching.
   */
  public async simulatePayment(params: PaymentParams, useCache = false): Promise<SimulationResult> {
    const sender = params.sender.trim().toUpperCase();
    const recipient = params.recipient.trim().toUpperCase();
    const token = params.token.trim().toUpperCase();
    const cacheKey = `${sender}:${recipient}:${token}:${params.amount}`;

    if (useCache) {
      const cached = this.simCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.result;
      }
    }

    const amount = BigInt(params.amount);
    const timestamp = Math.floor(Date.now() / 1000);

    let result: SimulationResult;

    // 0. Memo validation
    const memoValidation = this.validateMemo(params.memo);
    if (!memoValidation.valid) {
      result = {
        decision: 'BLOCK',
        reason: `Invalid Stellar payment memo: ${memoValidation.error}`,
        reasonCode: 2,
        isEscrow: false,
        spendCap: this.spendCap.toString(),
        estimatedFeeStroops: 0,
        timestamp,
      };
    } else if (amount <= 0n) {
      result = {
        decision: 'BLOCK',
        reason: 'Payment amount must be greater than zero',
        reasonCode: 5,
        isEscrow: false,
        spendCap: this.spendCap.toString(),
        estimatedFeeStroops: 0,
        timestamp,
      };
    } else if (this.denylist.has(sender)) {
      // 2. Sender denylist check
      result = {
        decision: 'BLOCK',
        reason: 'Sender address is present on the compliance denylist',
        reasonCode: 12,
        isEscrow: false,
        spendCap: this.spendCap.toString(),
        estimatedFeeStroops: 0,
        timestamp,
      };
    } else if (this.denylist.has(recipient)) {
      // 3. Recipient denylist check
      result = {
        decision: 'BLOCK',
        reason: 'Recipient address is restricted on the compliance denylist',
        reasonCode: 11,
        isEscrow: false,
        spendCap: this.spendCap.toString(),
        estimatedFeeStroops: 0,
        timestamp,
      };
    } else if (amount > this.spendCap) {
      // 4. Spend cap check (diverts to Escrow if exceeded)
      result = {
        decision: 'FLAG',
        reason: 'Payment exceeds spend cap threshold; will be held in on-chain Escrow for review',
        reasonCode: 6,
        isEscrow: true,
        spendCap: this.spendCap.toString(),
        estimatedFeeStroops: 739309,
        timestamp,
      };
    } else {
      // 5. Approved payment
      result = {
        decision: 'APPROVE',
        reason: 'Transaction satisfies all policy rules; approved for direct SAC transfer',
        reasonCode: 0,
        isEscrow: false,
        spendCap: this.spendCap.toString(),
        estimatedFeeStroops: 19237,
        timestamp,
      };
    }

    if (useCache) {
      this.simCache.set(cacheKey, { result, expiresAt: Date.now() + this.cacheTtlMs });
    }

    return result;
  }

  /**
   * Decode a numeric contract revert code into a human-readable explanation.
   */
  public decodeError(code: number): DecodedError {
    return decodeErrorCode(code);
  }

  /**
   * Get active network configuration.
   */
  public getConfig(): NetworkConfig {
    return { ...this.config };
  }

  /**
   * Convert stroops (1 XLM = 10,000,000 stroops) to decimal XLM string representation.
   */
  public static stroopsToXlm(stroops: bigint | string | number): string {
    const s = typeof stroops === 'bigint' ? stroops : BigInt(stroops);
    const whole = s / 10000000n;
    const rem = s % 10000000n;
    if (rem === 0n) return `${whole}`;
    const fraction = rem.toString().padStart(7, '0').replace(/0+$/, '');
    return `${whole}.${fraction}`;
  }

  /**
   * Convert decimal XLM string or number to stroops (bigint).
   */
  public static xlmToStroops(xlm: string | number): bigint {
    const str = xlm.toString().trim();
    const parts = str.split('.');
    const whole = BigInt(parts[0] || '0');
    const fractionStr = (parts[1] || '').slice(0, 7).padEnd(7, '0');
    const fraction = BigInt(fractionStr);
    return whole * 10000000n + fraction;
  }

  /**
   * Validate payment parameters prior to evaluation or simulation.
   */
  public validatePaymentParams(params: PaymentParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!params.sender || !params.sender.trim()) {
      errors.push('Sender address is required');
    }
    if (!params.recipient || !params.recipient.trim()) {
      errors.push('Recipient address is required');
    }
    if (!params.token || !params.token.trim()) {
      errors.push('Token address is required');
    }
    try {
      const amt = BigInt(params.amount);
      if (amt <= 0n) {
        errors.push('Amount must be positive');
      }
    } catch {
      errors.push('Amount must be a valid integer string representing stroops');
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate an entire array of payment parameters, returning per-item validation errors.
   */
  public validateBatchPayments(payments: PaymentParams[]): BatchValidationResult {
    const errorsByIndex: BatchValidationError[] = [];
    let validCount = 0;

    payments.forEach((payment, index) => {
      const res = this.validatePaymentParams(payment);
      if (!res.valid) {
        errorsByIndex.push({
          index,
          payment,
          errors: res.errors,
        });
      } else {
        validCount++;
      }
    });

    return {
      valid: errorsByIndex.length === 0,
      totalPayments: payments.length,
      validCount,
      invalidCount: errorsByIndex.length,
      errorsByIndex,
    };
  }

  /**
   * Fast compliance pre-check: returns true if the address is not on the denylist.
   */
  public isAddressCompliant(address: string): boolean {
    return !this.isDenylisted(address);
  }

  /**
   * Calculate dynamic transaction fee estimate incorporating base fee recommendations and Soroban resource charges.
   */
  public calculateDynamicFeeEstimate(
    amountStroops: bigint,
    tier: FeeTier = 'normal',
    customBaseFee?: number
  ): FeeEstimate {
    const isEscrow = amountStroops > this.spendCap;
    const resourceFeeStroops = isEscrow ? 739209 : 19137;

    let baseFeeStroops = customBaseFee || 100;
    if (!customBaseFee) {
      if (tier === 'low') baseFeeStroops = 100;
      else if (tier === 'normal') baseFeeStroops = 200;
      else if (tier === 'priority') baseFeeStroops = 1000;
    }

    const totalEstimatedFeeStroops = resourceFeeStroops + baseFeeStroops;
    const totalEstimatedFeeXlm = SafeguardClient.stroopsToXlm(totalEstimatedFeeStroops);

    return {
      tier,
      baseFeeStroops,
      resourceFeeStroops,
      totalEstimatedFeeStroops,
      totalEstimatedFeeXlm,
      isEscrow,
    };
  }

  /**
   * Estimate Soroban invocation fee in stroops based on whether amount triggers direct or escrow routing.
   */
  public estimatePaymentFee(amountStroops: bigint): number {
    return amountStroops > this.spendCap ? 739309 : 19237;
  }

  /**
   * Get summarized policy metadata for client dashboards.
   */
  public getPolicySummary(): {
    spendCapStroops: string;
    denylistedCount: number;
    paymentContractId: string;
  } {
    return {
      spendCapStroops: this.spendCap.toString(),
      denylistedCount: this.denylist.size,
      paymentContractId: this.config.paymentContractId,
    };
  }

  /**
   * Clear cached simulation results.
   */
  public clearSimulationCache(): void {
    this.simCache.clear();
  }

  /**
   * Return number of cached simulation entries.
   */
  public getSimulationCacheSize(): number {
    return this.simCache.size;
  }

  /**
   * Return array of known Stellar Asset Contract (SAC) token definitions.
   */
  public getSupportedTokens(): TokenMetadata[] {
    return Object.values(KNOWN_SAC_TOKENS);
  }

  /**
   * Resolve token metadata by asset symbol (e.g. 'USDC') or contract address.
   */
  public resolveToken(symbolOrContract: string): TokenMetadata | undefined {
    const clean = symbolOrContract.trim().toUpperCase();
    if (KNOWN_SAC_TOKENS[clean]) {
      return KNOWN_SAC_TOKENS[clean];
    }
    return Object.values(KNOWN_SAC_TOKENS).find(
      (t) => t.contractId.toUpperCase() === clean
    );
  }
}
