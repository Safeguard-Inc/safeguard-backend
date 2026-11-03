/**
 * Soroban Storage Footprint Analyzer & Rent Fee Forecaster.
 *
 * Implements Stellar/Soroban state archival and rent fee analysis,
 * projecting storage footprint costs and TTL extension requirements.
 */

export type StorageEntryType = 'instance' | 'persistent' | 'temporary';

export interface StorageEntryProfile {
  key: string;
  type: StorageEntryType;
  byteSize: number;
  liveUntilLedger: number;
}

export interface ContractFootprint {
  contractId: string;
  entries: StorageEntryProfile[];
  totalByteSize: number;
  instanceEntries: number;
  persistentEntries: number;
  temporaryEntries: number;
}

export interface RentProjection {
  currentLedger: number;
  minLiveUntilLedger: number;
  ledgersRemaining: number;
  daysRemaining: number;
  needsExtension: boolean;
  recommendedExtensionLedgers: number;
  estimatedExtensionFeeStroops: number;
  estimatedExtensionFeeXlm: string;
}

export interface RentCostModel {
  ledgersPerDay: number; // typically 17280 (5-second ledgers)
  stroopsPerEntry: number; // base entry footprint cost
  stroopsPerBytePerDay: number; // storage byte rate
  warningThresholdDays: number; // default 14 days
  targetExtensionDays: number; // default 30 days
}

export const DEFAULT_RENT_COST_MODEL: RentCostModel = {
  ledgersPerDay: 17280,
  stroopsPerEntry: 200,
  stroopsPerBytePerDay: 5,
  warningThresholdDays: 14,
  targetExtensionDays: 30,
};

export class FootprintAnalyzer {
  private costModel: RentCostModel;

  constructor(customModel: Partial<RentCostModel> = {}) {
    this.costModel = { ...DEFAULT_RENT_COST_MODEL, ...customModel };
  }

  public getCostModel(): RentCostModel {
    return { ...this.costModel };
  }

  /**
   * Aggregate storage metrics across contract entries.
   */
  public analyzeFootprint(contractId: string, entries: StorageEntryProfile[]): ContractFootprint {
    let totalByteSize = 0;
    let instanceEntries = 0;
    let persistentEntries = 0;
    let temporaryEntries = 0;

    for (const e of entries) {
      totalByteSize += e.byteSize;
      if (e.type === 'instance') instanceEntries++;
      else if (e.type === 'persistent') persistentEntries++;
      else if (e.type === 'temporary') temporaryEntries++;
    }

    return {
      contractId,
      entries,
      totalByteSize,
      instanceEntries,
      persistentEntries,
      temporaryEntries,
    };
  }

  /**
   * Project rent TTL and estimate renewal costs for a contract footprint.
   */
  public projectRent(footprint: ContractFootprint, currentLedger: number): RentProjection {
    if (footprint.entries.length === 0) {
      return {
        currentLedger,
        minLiveUntilLedger: currentLedger,
        ledgersRemaining: 0,
        daysRemaining: 0,
        needsExtension: false,
        recommendedExtensionLedgers: 0,
        estimatedExtensionFeeStroops: 0,
        estimatedExtensionFeeXlm: '0.0000000',
      };
    }

    // Find the entry closest to expiration
    let minLiveUntil = Infinity;
    for (const e of footprint.entries) {
      if (e.liveUntilLedger < minLiveUntil) {
        minLiveUntil = e.liveUntilLedger;
      }
    }

    const ledgersRemaining = Math.max(0, minLiveUntil - currentLedger);
    const daysRemaining = Number((ledgersRemaining / this.costModel.ledgersPerDay).toFixed(1));
    const needsExtension = daysRemaining <= this.costModel.warningThresholdDays;

    const recommendedExtensionLedgers = this.costModel.targetExtensionDays * this.costModel.ledgersPerDay;

    // Calculate fee: base cost + (byteSize * days * rate)
    const baseEntryFee = footprint.entries.length * this.costModel.stroopsPerEntry;
    const byteFee = footprint.totalByteSize * this.costModel.targetExtensionDays * this.costModel.stroopsPerBytePerDay;
    const totalStroops = baseEntryFee + byteFee;
    const xlmFee = (totalStroops / 10_000_000).toFixed(7);

    return {
      currentLedger,
      minLiveUntilLedger: minLiveUntil,
      ledgersRemaining,
      daysRemaining,
      needsExtension,
      recommendedExtensionLedgers,
      estimatedExtensionFeeStroops: totalStroops,
      estimatedExtensionFeeXlm: xlmFee,
    };
  }
}
