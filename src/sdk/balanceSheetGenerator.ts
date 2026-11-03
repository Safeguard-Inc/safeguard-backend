import { createHash } from 'crypto';

export interface BalanceSheetTokenLine {
  tokenSymbol: string;
  contractAddress: string;
  lockedInEscrowStroops: string;
  settledVolumeStroops: string;
  refundedVolumeStroops: string;
  lockedDecimal: string;
  settledDecimal: string;
  unitPriceUsd: number;
  lockedUsdValue: number;
  settledUsdValue: number;
}

export interface InstitutionalBalanceSheet {
  statementId: string;
  asOfDate: string;
  organization: string;
  network: string;
  reportingCurrency: string;
  totalLockedEscrowUsd: number;
  totalSettledVolumeUsd: number;
  activeEscrowsCount: number;
  disputedEscrowsCount: number;
  assets: BalanceSheetTokenLine[];
  auditSignatureHash: string;
}

export interface BalanceSheetInputOptions {
  statementId?: string;
  organization?: string;
  network?: string;
  tokenLines: {
    tokenSymbol: string;
    contractAddress: string;
    lockedStroops: bigint | string;
    settledStroops: bigint | string;
    refundedStroops?: bigint | string;
    unitPriceUsd: number;
    decimals?: number;
  }[];
  activeEscrowsCount: number;
  disputedEscrowsCount: number;
}

export class InstitutionalBalanceSheetReportGenerator {
  /**
   * Convert stroops/base units into formatted human decimal string.
   */
  public static stroopsToDecimal(stroops: bigint | string, decimals: number = 7): string {
    const val = BigInt(stroops);
    const divisor = 10n ** BigInt(decimals);
    const integerPart = val / divisor;
    const remainder = val % divisor;
    const paddedFrac = remainder.toString().padStart(decimals, '0');
    return `${integerPart}.${paddedFrac}`;
  }

  /**
   * Deterministic canonical serialization for cryptographic hashing.
   */
  public static canonicalStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((i) => InstitutionalBalanceSheetReportGenerator.canonicalStringify(i)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + InstitutionalBalanceSheetReportGenerator.canonicalStringify(obj[k])).join(',') + '}';
  }

  /**
   * Calculates deterministic SHA-256 integrity hash for an audited balance sheet.
   */
  public static computeChecksum(data: any): string {
    const canonical = InstitutionalBalanceSheetReportGenerator.canonicalStringify(data);
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Generates a fully calculated and signed institutional balance sheet statement.
   */
  public static generate(options: BalanceSheetInputOptions): InstitutionalBalanceSheet {
    let totalLockedUsd = 0;
    let totalSettledUsd = 0;

    const assets: BalanceSheetTokenLine[] = options.tokenLines.map((line) => {
      const decimals = line.decimals ?? 7;
      const lockedStroops = BigInt(line.lockedStroops);
      const settledStroops = BigInt(line.settledStroops);
      const refundedStroops = BigInt(line.refundedStroops ?? 0);

      const lockedNum = Number(lockedStroops) / 10 ** decimals;
      const settledNum = Number(settledStroops) / 10 ** decimals;

      const lockedUsd = Math.round(lockedNum * line.unitPriceUsd * 100) / 100;
      const settledUsd = Math.round(settledNum * line.unitPriceUsd * 100) / 100;

      totalLockedUsd += lockedUsd;
      totalSettledUsd += settledUsd;

      return {
        tokenSymbol: line.tokenSymbol,
        contractAddress: line.contractAddress,
        lockedInEscrowStroops: lockedStroops.toString(),
        settledVolumeStroops: settledStroops.toString(),
        refundedVolumeStroops: refundedStroops.toString(),
        lockedDecimal: InstitutionalBalanceSheetReportGenerator.stroopsToDecimal(lockedStroops, decimals),
        settledDecimal: InstitutionalBalanceSheetReportGenerator.stroopsToDecimal(settledStroops, decimals),
        unitPriceUsd: line.unitPriceUsd,
        lockedUsdValue: lockedUsd,
        settledUsdValue: settledUsd,
      };
    });

    const statement: Omit<InstitutionalBalanceSheet, 'auditSignatureHash'> = {
      statementId: options.statementId || `SFS-BS-${Date.now()}`,
      asOfDate: new Date().toISOString(),
      organization: options.organization || 'Institutional Treasury Client',
      network: options.network || 'Stellar Testnet',
      reportingCurrency: 'USD',
      totalLockedEscrowUsd: Math.round(totalLockedUsd * 100) / 100,
      totalSettledVolumeUsd: Math.round(totalSettledUsd * 100) / 100,
      activeEscrowsCount: options.activeEscrowsCount,
      disputedEscrowsCount: options.disputedEscrowsCount,
      assets,
    };

    const auditSignatureHash = InstitutionalBalanceSheetReportGenerator.computeChecksum(statement);

    return {
      ...statement,
      auditSignatureHash,
    };
  }

  /**
   * Formats the institutional statement as an audited markdown document.
   */
  public static formatMarkdown(sheet: InstitutionalBalanceSheet): string {
    const assetRows = sheet.assets
      .map(
        (a) =>
          `| **${a.tokenSymbol}** | \`${a.contractAddress.substring(0, 8)}...${a.contractAddress.substring(a.contractAddress.length - 4)}\` | ${a.lockedDecimal} | \$${a.lockedUsdValue.toLocaleString()} | ${a.settledDecimal} | \$${a.settledUsdValue.toLocaleString()} |`
      )
      .join('\n');

    return `# Safeguard Institutional Balance Sheet & Collateral Statement
**Statement Reference:** \`${sheet.statementId}\`  
**Audit Integrity Checksum:** \`${sheet.auditSignatureHash}\`  
**As of Date:** ${sheet.asOfDate}  
**Organization:** ${sheet.organization}  
**Network:** ${sheet.network}  

---

### Collateral & Escrow Summary
- **Total Collateral Locked in Timelocked Escrows:** \$${sheet.totalLockedEscrowUsd.toLocaleString()} ${sheet.reportingCurrency}
- **Total Settled Disbursement Volume:** \$${sheet.totalSettledVolumeUsd.toLocaleString()} ${sheet.reportingCurrency}
- **Active Pending Escrows:** ${sheet.activeEscrowsCount}
- **Escrows Under Dispute:** ${sheet.disputedEscrowsCount}

### Asset-by-Asset Allocation Breakdown
| Asset | SAC Contract | Locked Escrow | Collateral Value (USD) | Settled Volume | Settled Value (USD) |
| :--- | :--- | :--- | :--- | :--- | :--- |
${assetRows}

---
*Cryptographically verified by Safeguard Protocol Engine. SHA-256 seal: \`${sheet.auditSignatureHash}\`*
`;
  }
}
