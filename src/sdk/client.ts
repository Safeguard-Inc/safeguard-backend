import { NetworkConfig, PaymentParams, SimulationResult, TESTNET_CONFIG, TokenMetadata, KNOWN_SAC_TOKENS } from './types.js';
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

    // 1. Amount validation
    if (amount <= 0n) {
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
  public static stroopsToXlm(stroops: bigint | string): string {
    const s = typeof stroops === 'string' ? BigInt(stroops) : stroops;
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
   * Fast compliance pre-check: returns true if the address is not on the denylist.
   */
  public isAddressCompliant(address: string): boolean {
    return !this.isDenylisted(address);
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
