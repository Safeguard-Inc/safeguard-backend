/**
 * contractConfigResolver.ts
 *
 * Resolves on-chain operational configuration and health status for
 * Safeguard Payments and Safeguard Policy smart contracts.
 */

export interface PaymentGatewayConfigPayload {
  admin: string;
  pendingAdmin: string | null;
  policyContract: string | null;
  guardian: string | null;
  escrowPeriod: number;
  spendCapStroops: string;
  minPaymentAmountStroops: string;
  isPaused: boolean;
  requireAllowlist: boolean;
  totalVolumeStroops: string;
  paymentSequence: number;
}

export interface PolicyContractMetadataPayload {
  schemaVersion: number;
  admin: string;
  policiesCount: number;
  registryAuthoritiesCount: number;
  policyAuthoritiesCount: number;
}

export interface ConfigHealthEvaluation {
  healthy: boolean;
  status: 'OPTIMAL' | 'DEGRADED' | 'PAUSED' | 'UNINITIALIZED';
  issues: string[];
}

export interface PauseStatusPayload {
  isPaused: boolean;
  pausedUntil: number; // Unix timestamp in seconds, 0 = indefinite/none
  pausedBy: string | null;
  remainingSeconds: number; // calculated relative to currentTime
  autoResumeAt: string | null; // ISO string if pausedUntil > 0
  circuitBreakerState: 'ACTIVE_PAUSED' | 'TIMELOCKED_PAUSED' | 'NORMAL_OPERATIONAL';
}

export class ContractConfigResolver {
  /**
   * Resolves emergency circuit breaker pause status and computes remaining timelock seconds.
   */
  public static resolvePauseStatus(
    isPaused: boolean,
    pausedUntil: number = 0,
    pausedBy: string | null = null,
    nowEpochSec: number = Math.floor(Date.now() / 1000)
  ): PauseStatusPayload {
    const expired = isPaused && pausedUntil > 0 && nowEpochSec >= pausedUntil;
    const effectivePaused = isPaused && !expired;
    const remainingSeconds = effectivePaused && pausedUntil > 0 ? Math.max(0, pausedUntil - nowEpochSec) : 0;
    const autoResumeAt = effectivePaused && pausedUntil > 0 ? new Date(pausedUntil * 1000).toISOString() : null;

    let circuitBreakerState: 'ACTIVE_PAUSED' | 'TIMELOCKED_PAUSED' | 'NORMAL_OPERATIONAL' = 'NORMAL_OPERATIONAL';
    if (effectivePaused) {
      circuitBreakerState = pausedUntil > 0 ? 'TIMELOCKED_PAUSED' : 'ACTIVE_PAUSED';
    }

    return {
      isPaused: effectivePaused,
      pausedUntil,
      pausedBy,
      remainingSeconds,
      autoResumeAt,
      circuitBreakerState,
    };
  }

  /**
   * Evaluates the operational readiness and risk profile of the payment gateway contract.
   */
  public static evaluateHealth(config: PaymentGatewayConfigPayload): ConfigHealthEvaluation {
    const issues: string[] = [];

    if (!config.admin) {
      issues.push('Contract admin is uninitialized');
      return { healthy: false, status: 'UNINITIALIZED', issues };
    }

    if (config.isPaused) {
      issues.push('Payment operations are paused via guardian circuit breaker');
      return { healthy: false, status: 'PAUSED', issues };
    }

    if (!config.policyContract) {
      issues.push('No policy contract attached; operating in direct fallback mode');
    }

    if (config.guardian === null) {
      issues.push('No security guardian assigned for emergency pause defense');
    }

    try {
      const cap = BigInt(config.spendCapStroops);
      if (cap <= 0n) {
        issues.push('Spend cap is set to 0; all transfers will route to escrow');
      }
    } catch {
      issues.push('Spend cap has invalid numerical format');
    }

    const healthy = issues.length === 0 || (issues.length === 1 && issues[0].includes('guardian'));
    const status = config.isPaused ? 'PAUSED' : issues.length > 0 ? 'DEGRADED' : 'OPTIMAL';

    return {
      healthy,
      status,
      issues,
    };
  }

  /**
   * Formats stroops into human-readable XLM decimal units.
   */
  public static formatStroops(stroops: string): string {
    try {
      const units = Number(BigInt(stroops)) / 10_000_000;
      return units.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 7,
      });
    } catch {
      return '0.00';
    }
  }

  /**
   * Validates contract addresses.
   */
  public static isValidAddress(address?: string | null): boolean {
    if (!address) return false;
    return (
      (address.startsWith('G') && address.length === 56) ||
      (address.startsWith('C') && address.length === 56)
    );
  }
}
