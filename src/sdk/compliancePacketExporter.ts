import { createHash } from 'crypto';

export interface CompliancePacketManifest {
  packetId: string;
  institutionName: string;
  jurisdiction: string;
  networkPassphrase: string;
  contracts: {
    payments: string;
    policy: string;
  };
  asOfTimestamp: number;
}

export interface SealedCompliancePacket {
  manifest: CompliancePacketManifest;
  auditMetrics: {
    totalTransactions: number;
    approvalRatePercent: number;
    sanctionsHitsBlocked: number;
  };
  balanceSheetSummary: {
    totalLockedCollateralUsd: number;
    totalSettledVolumeUsd: number;
    reportingCurrency: string;
  };
  telemetryStatus: {
    synchronized: boolean;
    circuitBreakerPaused: boolean;
    ledgerSequence: number;
  };
  masterPacketSeal: string;
}

export interface CompliancePacketBuildOptions {
  packetId?: string;
  institutionName?: string;
  jurisdiction?: string;
  networkPassphrase?: string;
  paymentsContractId?: string;
  policyContractId?: string;
  auditMetrics: {
    totalTransactions: number;
    approvalRatePercent: number;
    sanctionsHitsBlocked: number;
  };
  balanceSheetSummary: {
    totalLockedCollateralUsd: number;
    totalSettledVolumeUsd: number;
    reportingCurrency?: string;
  };
  telemetryStatus: {
    synchronized: boolean;
    circuitBreakerPaused: boolean;
    ledgerSequence: number;
  };
}

export class RegulatoryCompliancePacketExporter {
  public static canonicalStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((i) => RegulatoryCompliancePacketExporter.canonicalStringify(i)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + RegulatoryCompliancePacketExporter.canonicalStringify(obj[k])).join(',') + '}';
  }

  public static computeSeal(packetBody: Omit<SealedCompliancePacket, 'masterPacketSeal'>): string {
    const canonical = RegulatoryCompliancePacketExporter.canonicalStringify(packetBody);
    return createHash('sha256').update(canonical).digest('hex');
  }

  public static build(options: CompliancePacketBuildOptions): SealedCompliancePacket {
    const manifest: CompliancePacketManifest = {
      packetId: options.packetId || `SFS-REG-PKT-${Date.now()}`,
      institutionName: options.institutionName || 'Global Institutional Custodian',
      jurisdiction: options.jurisdiction || 'US-OFAC / FinCEN',
      networkPassphrase: options.networkPassphrase || 'Test SDF Network ; September 2015',
      contracts: {
        payments: options.paymentsContractId || 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
        policy: options.policyContractId || 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4',
      },
      asOfTimestamp: Date.now(),
    };

    const packetBody: Omit<SealedCompliancePacket, 'masterPacketSeal'> = {
      manifest,
      auditMetrics: options.auditMetrics,
      balanceSheetSummary: {
        totalLockedCollateralUsd: options.balanceSheetSummary.totalLockedCollateralUsd,
        totalSettledVolumeUsd: options.balanceSheetSummary.totalSettledVolumeUsd,
        reportingCurrency: options.balanceSheetSummary.reportingCurrency || 'USD',
      },
      telemetryStatus: options.telemetryStatus,
    };

    const masterPacketSeal = RegulatoryCompliancePacketExporter.computeSeal(packetBody);

    return {
      ...packetBody,
      masterPacketSeal,
    };
  }

  public static verifyIntegrity(packet: SealedCompliancePacket): boolean {
    const { masterPacketSeal, ...body } = packet;
    const computed = RegulatoryCompliancePacketExporter.computeSeal(body);
    return computed === masterPacketSeal;
  }

  public static formatSummaryMarkdown(packet: SealedCompliancePacket): string {
    return `# Institutional Regulatory Compliance Proof Packet
**Packet Reference ID:** \`${packet.manifest.packetId}\`  
**Master SHA-256 Integrity Seal:** \`${packet.masterPacketSeal}\`  
**Institution:** ${packet.manifest.institutionName}  
**Jurisdiction:** ${packet.manifest.jurisdiction}  
**Timestamp:** ${new Date(packet.manifest.asOfTimestamp).toISOString()}  

---

### Protocol & Identity Architecture
- **Payments Gateway Contract:** \`${packet.manifest.contracts.payments}\`
- **Enforcement Policy Contract:** \`${packet.manifest.contracts.policy}\`
- **Network Passphrase:** \`${packet.manifest.networkPassphrase}\`

### Compliance Verdict & AML Screening
- **Total Transactions Screened:** ${packet.auditMetrics.totalTransactions.toLocaleString()}
- **Policy Approval Rate:** ${packet.auditMetrics.approvalRatePercent}%
- **Sanctions & OFAC Interceptions:** ${packet.auditMetrics.sanctionsHitsBlocked}

### Collateral & Exposure Statement
- **Locked Escrow Collateral:** \$${packet.balanceSheetSummary.totalLockedCollateralUsd.toLocaleString()} ${packet.balanceSheetSummary.reportingCurrency}
- **Gross Settled Volume:** \$${packet.balanceSheetSummary.totalSettledVolumeUsd.toLocaleString()} ${packet.balanceSheetSummary.reportingCurrency}

### Telemetry Health & Node Consensus
- **On-Chain Node Synchronization:** ${packet.telemetryStatus.synchronized ? '✓ In-Sync' : '⚠️ Degraded'}
- **Circuit Breaker State:** ${packet.telemetryStatus.circuitBreakerPaused ? 'HALTED' : 'NORMAL'}
- **Consensus Ledger Sequence:** #${packet.telemetryStatus.ledgerSequence}

---
*Signed by Safeguard Cryptographic Engine. Cryptographic Seal: \`${packet.masterPacketSeal}\`*
`;
  }
}
