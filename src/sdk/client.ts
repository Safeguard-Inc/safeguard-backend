import { NetworkConfig, PaymentParams, SimulationResult, TESTNET_CONFIG } from './types.js';
import { decodeErrorCode, DecodedError } from './errors.js';

export class SafeguardClient {
  private config: NetworkConfig;
  private denylist: Set<string> = new Set();
  private spendCap: bigint = 100_0000000n; // 100 units: matches the live Testnet deployment (7 decimals)

  constructor(config: Partial<NetworkConfig> = {}) {
    this.config = { ...TESTNET_CONFIG, ...config };
  }

  /**
   * Set local denylist simulation mirror.
   */
  public setDenylist(addresses: string[]): void {
    this.denylist = new Set(addresses.map((a) => a.trim().toUpperCase()));
  }

  /**
   * Set local spend cap simulation mirror.
   */
  public setSpendCap(cap: string): void {
    this.spendCap = BigInt(cap);
  }

  /**
   * Simulate a payment against policy rules.
   * Performs zero-broadcast pre-flight evaluation.
   */
  public async simulatePayment(params: PaymentParams): Promise<SimulationResult> {
    const sender = params.sender.trim().toUpperCase();
    const recipient = params.recipient.trim().toUpperCase();
    const amount = BigInt(params.amount);
    const timestamp = Math.floor(Date.now() / 1000);

    // 1. Amount validation
    if (amount <= 0n) {
      return {
        decision: 'BLOCK',
        reason: 'Payment amount must be greater than zero',
        reasonCode: 5,
        isEscrow: false,
        spendCap: this.spendCap.toString(),
        estimatedFeeStroops: 0, // rejected at simulation; never submitted
        timestamp,
      };
    }

    // 2. Sender denylist check
    if (this.denylist.has(sender)) {
      return {
        decision: 'BLOCK',
        reason: 'Sender address is present on the compliance denylist',
        reasonCode: 12,
        isEscrow: false,
        spendCap: this.spendCap.toString(),
        estimatedFeeStroops: 0, // rejected at simulation; never submitted
        timestamp,
      };
    }

    // 3. Recipient denylist check
    if (this.denylist.has(recipient)) {
      return {
        decision: 'BLOCK',
        reason: 'Recipient address is restricted on the compliance denylist',
        reasonCode: 11,
        isEscrow: false,
        spendCap: this.spendCap.toString(),
        estimatedFeeStroops: 0, // rejected at simulation; never submitted
        timestamp,
      };
    }

    // 4. Spend cap check (diverts to Escrow if exceeded)
    if (amount > this.spendCap) {
      return {
        decision: 'FLAG',
        reason: 'Payment exceeds spend cap threshold; will be held in on-chain Escrow for review',
        reasonCode: 6,
        isEscrow: true,
        spendCap: this.spendCap.toString(),
        estimatedFeeStroops: 739309, // measured on Testnet; mostly rent for the new escrow entry
        timestamp,
      };
    }

    // 5. Approved payment
    return {
      decision: 'APPROVE',
      reason: 'Transaction satisfies all policy rules; approved for direct SAC transfer',
      reasonCode: 0,
      isEscrow: false,
      spendCap: this.spendCap.toString(),
      estimatedFeeStroops: 19237, // measured on Testnet (docs/BENCHMARKS.md in safeguard-contracts)
      timestamp,
    };
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
}
