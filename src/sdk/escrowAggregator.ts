/**
 * escrowAggregator.ts
 * Enterprise telemetry and financial reporting aggregator for Stellar Soroban escrows.
 */

import { EscrowStatus } from './types.js';
import { StoredEscrow } from '../server/store.js';

export interface TokenFinancialSummary {
  token: string;
  totalVolume: bigint;
  pendingVolume: bigint;
  settledVolume: bigint;
  escrowCount: number;
}

export interface EscrowFinancialMetrics {
  totalEscrows: number;
  statusCounts: Record<EscrowStatus, number>;
  totalVolumeLocked: bigint;
  totalVolumeSettled: bigint;
  tokenBreakdown: Record<string, TokenFinancialSummary>;
  averagePendingTimelockRemainingSeconds: number;
  topSendersByVolume: { address: string; totalVolume: bigint }[];
  topRecipientsByVolume: { address: string; totalVolume: bigint }[];
}

export class EscrowFinancialAggregator {
  /**
   * Compute comprehensive financial and duration metrics across escrow records.
   */
  public static aggregate(
    escrows: StoredEscrow[],
    currentTimestampSeconds: number = Math.floor(Date.now() / 1000)
  ): EscrowFinancialMetrics {
    const statusCounts: Record<EscrowStatus, number> = {
      Pending: 0,
      Released: 0,
      Refunded: 0,
      Disputed: 0,
      Arbitrated: 0,
    };

    let totalVolumeLocked = 0n;
    let totalVolumeSettled = 0n;
    let totalPendingTimelockRemaining = 0;
    let pendingCount = 0;

    const tokenMap = new Map<string, TokenFinancialSummary>();
    const senderMap = new Map<string, bigint>();
    const recipientMap = new Map<string, bigint>();

    for (const esc of escrows) {
      const status = esc.status in statusCounts ? esc.status : 'Pending';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      let amountBn = 0n;
      try {
        amountBn = BigInt(esc.amount);
      } catch {
        amountBn = 0n;
      }

      // Token grouping
      const tokenKey = esc.token || 'UNKNOWN';
      let tokenSummary = tokenMap.get(tokenKey);
      if (!tokenSummary) {
        tokenSummary = {
          token: tokenKey,
          totalVolume: 0n,
          pendingVolume: 0n,
          settledVolume: 0n,
          escrowCount: 0,
        };
        tokenMap.set(tokenKey, tokenSummary);
      }
      tokenSummary.escrowCount += 1;
      tokenSummary.totalVolume += amountBn;

      if (status === 'Pending' || status === 'Disputed') {
        totalVolumeLocked += amountBn;
        tokenSummary.pendingVolume += amountBn;
        const remaining = Math.max(0, esc.expiresAt - currentTimestampSeconds);
        totalPendingTimelockRemaining += remaining;
        pendingCount += 1;
      } else {
        totalVolumeSettled += amountBn;
        tokenSummary.settledVolume += amountBn;
      }

      // Sender volume
      if (esc.sender) {
        senderMap.set(esc.sender, (senderMap.get(esc.sender) || 0n) + amountBn);
      }
      // Recipient volume
      if (esc.recipient) {
        recipientMap.set(esc.recipient, (recipientMap.get(esc.recipient) || 0n) + amountBn);
      }
    }

    const tokenBreakdown: Record<string, TokenFinancialSummary> = {};
    for (const [token, summary] of tokenMap.entries()) {
      tokenBreakdown[token] = summary;
    }

    const topSendersByVolume = Array.from(senderMap.entries())
      .map(([address, totalVolume]) => ({ address, totalVolume }))
      .sort((a, b) => (b.totalVolume > a.totalVolume ? 1 : b.totalVolume < a.totalVolume ? -1 : 0))
      .slice(0, 10);

    const topRecipientsByVolume = Array.from(recipientMap.entries())
      .map(([address, totalVolume]) => ({ address, totalVolume }))
      .sort((a, b) => (b.totalVolume > a.totalVolume ? 1 : b.totalVolume < a.totalVolume ? -1 : 0))
      .slice(0, 10);

    const averagePendingTimelockRemainingSeconds =
      pendingCount > 0 ? Math.round(totalPendingTimelockRemaining / pendingCount) : 0;

    return {
      totalEscrows: escrows.length,
      statusCounts,
      totalVolumeLocked,
      totalVolumeSettled,
      tokenBreakdown,
      averagePendingTimelockRemainingSeconds,
      topSendersByVolume,
      topRecipientsByVolume,
    };
  }
}
