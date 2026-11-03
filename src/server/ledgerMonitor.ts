/**
 * ledgerMonitor.ts
 *
 * Real-time Stellar ledger synchronization and lag monitoring service.
 * Tracks gap between network consensus ledger and Safeguard indexer state to guarantee SLA compliance.
 */

export type LedgerSyncGrade = 'synced' | 'degraded' | 'desynced';

export interface LedgerHealthStatus {
  networkLatestLedger: number;
  indexerLastLedger: number;
  lagLedgers: number;
  estimatedLagSeconds: number;
  grade: LedgerSyncGrade;
  lastUpdatedMs: number;
  isHealthy: boolean;
}

export class LedgerSyncMonitor {
  private networkLatestLedger: number = 0;
  private indexerLastLedger: number = 0;
  private lastUpdatedMs: number = Date.now();
  private maxAcceptableLagLedgers: number;

  constructor(maxAcceptableLagLedgers = 5) {
    this.maxAcceptableLagLedgers = maxAcceptableLagLedgers;
  }

  public updateLedgers(networkLedger: number, indexerLedger: number): LedgerHealthStatus {
    this.networkLatestLedger = Math.max(0, networkLedger);
    this.indexerLastLedger = Math.max(0, indexerLedger);
    this.lastUpdatedMs = Date.now();
    return this.getStatus();
  }

  public getStatus(): LedgerHealthStatus {
    const lagLedgers = Math.max(0, this.networkLatestLedger - this.indexerLastLedger);
    // Stellar closes a new ledger approximately every 5 seconds
    const estimatedLagSeconds = lagLedgers * 5;

    let grade: LedgerSyncGrade = 'synced';
    if (lagLedgers > 10) {
      grade = 'desynced';
    } else if (lagLedgers > 2) {
      grade = 'degraded';
    }

    const isHealthy = lagLedgers <= this.maxAcceptableLagLedgers;

    return {
      networkLatestLedger: this.networkLatestLedger,
      indexerLastLedger: this.indexerLastLedger,
      lagLedgers,
      estimatedLagSeconds,
      grade,
      lastUpdatedMs: this.lastUpdatedMs,
      isHealthy,
    };
  }

  public isCompliantWithSla(customMaxLag?: number): boolean {
    const threshold = customMaxLag ?? this.maxAcceptableLagLedgers;
    const lag = Math.max(0, this.networkLatestLedger - this.indexerLastLedger);
    return lag <= threshold;
  }
}

export const defaultLedgerMonitor = new LedgerSyncMonitor();
