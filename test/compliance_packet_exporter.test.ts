import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RegulatoryCompliancePacketExporter,
  type CompliancePacketBuildOptions,
} from '../src/sdk/compliancePacketExporter.js';

describe('RegulatoryCompliancePacketExporter Unit Tests', () => {
  it('builds sealed regulatory compliance packet with valid SHA-256 seal', () => {
    const options: CompliancePacketBuildOptions = {
      packetId: 'SFS-TEST-PKT-001',
      institutionName: 'Swiss Digital Custody AG',
      jurisdiction: 'FINMA / Swiss DLT',
      auditMetrics: {
        totalTransactions: 1540,
        approvalRatePercent: 98.4,
        sanctionsHitsBlocked: 3,
      },
      balanceSheetSummary: {
        totalLockedCollateralUsd: 1500000,
        totalSettledVolumeUsd: 8200000,
        reportingCurrency: 'USD',
      },
      telemetryStatus: {
        synchronized: true,
        circuitBreakerPaused: false,
        ledgerSequence: 948201,
      },
    };

    const packet = RegulatoryCompliancePacketExporter.build(options);

    assert.equal(packet.manifest.packetId, 'SFS-TEST-PKT-001');
    assert.equal(packet.manifest.institutionName, 'Swiss Digital Custody AG');
    assert.equal(packet.masterPacketSeal.length, 64);
    assert.equal(RegulatoryCompliancePacketExporter.verifyIntegrity(packet), true);
  });

  it('detects tampering and invalidates packet integrity', () => {
    const options: CompliancePacketBuildOptions = {
      auditMetrics: { totalTransactions: 100, approvalRatePercent: 95, sanctionsHitsBlocked: 0 },
      balanceSheetSummary: { totalLockedCollateralUsd: 50000, totalSettledVolumeUsd: 200000 },
      telemetryStatus: { synchronized: true, circuitBreakerPaused: false, ledgerSequence: 1000 },
    };

    const packet = RegulatoryCompliancePacketExporter.build(options);
    assert.equal(RegulatoryCompliancePacketExporter.verifyIntegrity(packet), true);

    // Tamper with audit metrics
    const tampered = {
      ...packet,
      auditMetrics: {
        ...packet.auditMetrics,
        sanctionsHitsBlocked: 99,
      },
    };

    assert.equal(RegulatoryCompliancePacketExporter.verifyIntegrity(tampered), false);
  });

  it('formats verified markdown compliance document', () => {
    const options: CompliancePacketBuildOptions = {
      institutionName: 'London Clearing House',
      auditMetrics: { totalTransactions: 500, approvalRatePercent: 99.1, sanctionsHitsBlocked: 1 },
      balanceSheetSummary: { totalLockedCollateralUsd: 300000, totalSettledVolumeUsd: 1200000 },
      telemetryStatus: { synchronized: true, circuitBreakerPaused: false, ledgerSequence: 5500 },
    };

    const packet = RegulatoryCompliancePacketExporter.build(options);
    const md = RegulatoryCompliancePacketExporter.formatSummaryMarkdown(packet);

    assert.ok(md.includes('Regulatory Compliance Proof Packet'));
    assert.ok(md.includes('London Clearing House'));
    assert.ok(md.includes(packet.masterPacketSeal));
  });
});
