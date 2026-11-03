import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  InstitutionalBalanceSheetReportGenerator,
  type BalanceSheetInputOptions,
} from '../src/sdk/balanceSheetGenerator.js';

describe('InstitutionalBalanceSheetReportGenerator Unit Tests', () => {
  it('converts stroops to decimal strings accurately', () => {
    assert.equal(
      InstitutionalBalanceSheetReportGenerator.stroopsToDecimal(100_0000000n, 7),
      '100.0000000'
    );
    assert.equal(
      InstitutionalBalanceSheetReportGenerator.stroopsToDecimal('50000000', 6),
      '50.000000'
    );
  });

  it('computes deterministic SHA-256 checksum across identical inputs', () => {
    const data1 = { a: 1, b: 'test', c: [10, 20] };
    const data2 = { c: [10, 20], a: 1, b: 'test' };

    const hash1 = InstitutionalBalanceSheetReportGenerator.computeChecksum(data1);
    const hash2 = InstitutionalBalanceSheetReportGenerator.computeChecksum(data2);

    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64);
  });

  it('generates institutional balance sheet with calculated USD totals', () => {
    const options: BalanceSheetInputOptions = {
      statementId: 'SFS-TEST-001',
      organization: 'Delaware Custody Trust LLC',
      network: 'Stellar Testnet',
      tokenLines: [
        {
          tokenSymbol: 'USDC',
          contractAddress: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
          lockedStroops: 250_000_0000000n, // 250k USDC
          settledStroops: 1_000_000_0000000n, // 1M USDC
          refundedStroops: 50_000_0000000n,
          unitPriceUsd: 1.0,
          decimals: 7,
        },
        {
          tokenSymbol: 'XLM',
          contractAddress: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
          lockedStroops: 500_000_0000000n, // 500k XLM
          settledStroops: 2_000_000_0000000n, // 2M XLM
          unitPriceUsd: 0.12,
          decimals: 7,
        },
      ],
      activeEscrowsCount: 14,
      disputedEscrowsCount: 2,
    };

    const sheet = InstitutionalBalanceSheetReportGenerator.generate(options);

    assert.equal(sheet.statementId, 'SFS-TEST-001');
    assert.equal(sheet.organization, 'Delaware Custody Trust LLC');
    // USDC locked: 250,000 * $1 = $250,000. XLM locked: 500,000 * $0.12 = $60,000. Total = $310,000.
    assert.equal(sheet.totalLockedEscrowUsd, 310000);
    // USDC settled: 1,000,000 * $1 = $1,000,000. XLM settled: 2,000,000 * $0.12 = $240,000. Total = $1,240,000.
    assert.equal(sheet.totalSettledVolumeUsd, 1240000);
    assert.equal(sheet.activeEscrowsCount, 14);
    assert.equal(sheet.disputedEscrowsCount, 2);
    assert.equal(sheet.assets.length, 2);
    assert.ok(sheet.auditSignatureHash.length === 64);
  });

  it('formats verified markdown statement with asset table and cryptographic seal', () => {
    const options: BalanceSheetInputOptions = {
      statementId: 'SFS-STATEMENT-AUDIT',
      organization: 'Geneva Global Clearing',
      tokenLines: [
        {
          tokenSymbol: 'EURC',
          contractAddress: 'CBIELTK6YBZST5QB2THVG6T32UMXKAWZVZZOCNMDC772CHOO5ASINAKV',
          lockedStroops: 100_000_0000000n,
          settledStroops: 300_000_0000000n,
          unitPriceUsd: 1.08,
        },
      ],
      activeEscrowsCount: 5,
      disputedEscrowsCount: 0,
    };

    const sheet = InstitutionalBalanceSheetReportGenerator.generate(options);
    const md = InstitutionalBalanceSheetReportGenerator.formatMarkdown(sheet);

    assert.ok(md.includes('Safeguard Institutional Balance Sheet'));
    assert.ok(md.includes('Geneva Global Clearing'));
    assert.ok(md.includes('EURC'));
    assert.ok(md.includes(sheet.auditSignatureHash));
  });
});
