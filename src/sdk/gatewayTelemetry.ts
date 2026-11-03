/**
 * gatewayTelemetry.ts
 *
 * Enterprise reconciliation helper comparing on-chain gateway telemetry counters
 * against local indexer and database state.
 */

export interface OnChainTelemetryInput {
  currentSequence: number;
  totalEscrows: number;
  totalVolumeStroops: string;
  activeSpendCapStroops: string;
  isPaused: boolean;
}

export interface BackendStoreTelemetryInput {
  indexedTransactionsCount: number;
  indexedEscrowsCount: number;
  syncedLedgerSequence: number;
  ledgerLagSeconds: number;
}

export interface ReconciliationTelemetry {
  synchronized: boolean;
  status: 'IN_SYNC' | 'INDEXING_LAG' | 'DESYNCHRONIZED';
  sequenceDiscrepancy: number;
  escrowDiscrepancy: number;
  diagnostics: string[];
  reconciledAt: number;
}

export class GatewayTelemetryAggregator {
  /**
   * Reconciles on-chain state with off-chain indexer records.
   */
  public static reconcile(
    onChain: OnChainTelemetryInput,
    backend: BackendStoreTelemetryInput
  ): ReconciliationTelemetry {
    const diagnostics: string[] = [];

    const sequenceDiscrepancy = onChain.currentSequence - backend.indexedTransactionsCount;
    const escrowDiscrepancy = onChain.totalEscrows - backend.indexedEscrowsCount;

    if (onChain.isPaused) {
      diagnostics.push('Contract circuit breaker is currently active (operations paused)');
    }

    if (backend.ledgerLagSeconds > 30) {
      diagnostics.push(`Indexer is lagging behind Horizon ledger by ${backend.ledgerLagSeconds}s`);
    }

    if (escrowDiscrepancy > 0) {
      diagnostics.push(`Missing ${escrowDiscrepancy} unindexed escrows in local store`);
    } else if (escrowDiscrepancy < 0) {
      diagnostics.push(`Local store contains ${Math.abs(escrowDiscrepancy)} speculative escrows`);
    }

    if (sequenceDiscrepancy > 0) {
      diagnostics.push(`On-chain sequence is ahead of indexed transactions by ${sequenceDiscrepancy}`);
    }

    let status: 'IN_SYNC' | 'INDEXING_LAG' | 'DESYNCHRONIZED' = 'IN_SYNC';

    if (Math.abs(sequenceDiscrepancy) > 5 || Math.abs(escrowDiscrepancy) > 5) {
      status = 'DESYNCHRONIZED';
    } else if (sequenceDiscrepancy !== 0 || escrowDiscrepancy !== 0 || backend.ledgerLagSeconds > 10) {
      status = 'INDEXING_LAG';
    }

    return {
      synchronized: status === 'IN_SYNC',
      status,
      sequenceDiscrepancy,
      escrowDiscrepancy,
      diagnostics,
      reconciledAt: Date.now(),
    };
  }
}
