import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FootprintAnalyzer,
  type StorageEntryProfile,
  DEFAULT_RENT_COST_MODEL,
} from '../src/sdk/footprintAnalyzer';

describe('Soroban FootprintAnalyzer Unit Tests', () => {
  const analyzer = new FootprintAnalyzer();

  it('aggregates storage entries across instance, persistent, and temporary categories', () => {
    const entries: StorageEntryProfile[] = [
      { key: 'InstanceConfig', type: 'instance', byteSize: 256, liveUntilLedger: 500_000 },
      { key: 'Escrow:1', type: 'persistent', byteSize: 512, liveUntilLedger: 400_000 },
      { key: 'Escrow:2', type: 'persistent', byteSize: 512, liveUntilLedger: 450_000 },
      { key: 'Nonce:temp', type: 'temporary', byteSize: 64, liveUntilLedger: 350_000 },
    ];

    const footprint = analyzer.analyzeFootprint('CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', entries);
    assert.equal(footprint.contractId, 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC');
    assert.equal(footprint.entries.length, 4);
    assert.equal(footprint.totalByteSize, 256 + 512 + 512 + 64);
    assert.equal(footprint.instanceEntries, 1);
    assert.equal(footprint.persistentEntries, 2);
    assert.equal(footprint.temporaryEntries, 1);
  });

  it('projects rent TTL and detects required extension when under warning horizon', () => {
    const currentLedger = 300_000;
    // 5 days remaining: 5 * 17280 = 86400 ledgers => live until 386_400
    const entries: StorageEntryProfile[] = [
      { key: 'PolicyState', type: 'instance', byteSize: 1000, liveUntilLedger: 386_400 },
      { key: 'IdentityRecord', type: 'persistent', byteSize: 2000, liveUntilLedger: 600_000 },
    ];

    const footprint = analyzer.analyzeFootprint('CCONTRACT', entries);
    const projection = analyzer.projectRent(footprint, currentLedger);

    assert.equal(projection.currentLedger, 300_000);
    assert.equal(projection.minLiveUntilLedger, 386_400);
    assert.equal(projection.ledgersRemaining, 86_400);
    assert.equal(projection.daysRemaining, 5.0);
    // Since 5 days <= 14 days warning threshold:
    assert.equal(projection.needsExtension, true);

    // Recommended extension is 30 days = 30 * 17280 = 518400 ledgers
    assert.equal(projection.recommendedExtensionLedgers, 30 * 17280);

    // Cost formula: 2 entries * 200 + 3000 bytes * 30 days * 5 stroops = 400 + 450,000 = 450,400 stroops
    assert.equal(projection.estimatedExtensionFeeStroops, 450_400);
    assert.equal(projection.estimatedExtensionFeeXlm, '0.0450400');
  });

  it('reports no extension required when days remaining exceed threshold', () => {
    const currentLedger = 100_000;
    // 60 days remaining: 60 * 17280 = 1,036,800 => live until 1,136,800
    const entries: StorageEntryProfile[] = [
      { key: 'SafeEntry', type: 'persistent', byteSize: 500, liveUntilLedger: 1_136_800 },
    ];

    const footprint = analyzer.analyzeFootprint('CSAFE', entries);
    const projection = analyzer.projectRent(footprint, currentLedger);

    assert.equal(projection.daysRemaining, 60.0);
    assert.equal(projection.needsExtension, false);
  });

  it('handles empty footprint safely', () => {
    const footprint = analyzer.analyzeFootprint('CEMPTY', []);
    const projection = analyzer.projectRent(footprint, 100_000);

    assert.equal(projection.ledgersRemaining, 0);
    assert.equal(projection.needsExtension, false);
    assert.equal(projection.estimatedExtensionFeeStroops, 0);
  });
});
