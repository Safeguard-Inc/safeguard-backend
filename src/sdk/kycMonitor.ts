/**
 * KYC Attestation Expiration Monitor and Renewal Alert Detector.
 *
 * Monitors on-chain identity expiration timestamps against configurable warning horizons,
 * identifying accounts that require re-verification or credential renewal.
 */

export type KycStatus = 'Permanent' | 'Active' | 'ExpiringSoon' | 'Expired' | 'Unverified';

export interface KycAccountRecord {
  address: string;
  expiresAt: number | null | undefined; // Unix epoch seconds (0 = permanent attestation)
  level?: number;
  attestationRef?: string;
  metadata?: Record<string, unknown>;
}

export interface KycAccountEvaluation {
  address: string;
  status: KycStatus;
  expiresAt: number | null;
  secondsRemaining: number | null;
  daysRemaining: number | null;
  isCompliant: boolean; // true if Active or Permanent
  needsRenewal: boolean; // true if ExpiringSoon or Expired
  level?: number;
}

export interface KycAuditSummary {
  total: number;
  permanent: number;
  active: number;
  expiringSoon: number;
  expired: number;
  unverified: number;
  complianceRate: number; // percentage 0-100
  evaluatedAt: number;
}

export interface KycRenewalAlert {
  address: string;
  status: 'ExpiringSoon' | 'Expired';
  severity: 'warning' | 'critical';
  expiresAt: number;
  daysRemaining: number;
  message: string;
}

export class KycExpirationMonitor {
  public static readonly DEFAULT_WARNING_HORIZON_SECONDS = 7 * 24 * 60 * 60; // 7 days

  private warningHorizonSeconds: number;

  constructor(warningHorizonSeconds: number = KycExpirationMonitor.DEFAULT_WARNING_HORIZON_SECONDS) {
    this.warningHorizonSeconds = warningHorizonSeconds;
  }

  public getWarningHorizonSeconds(): number {
    return this.warningHorizonSeconds;
  }

  public setWarningHorizonSeconds(seconds: number): void {
    if (seconds <= 0) throw new Error('Warning horizon must be greater than zero');
    this.warningHorizonSeconds = seconds;
  }

  /**
   * Classify a raw expiration timestamp against the given timestamp (seconds).
   */
  public classify(expiresAt: number | null | undefined, nowSeconds?: number): KycStatus {
    if (expiresAt === undefined || expiresAt === null) {
      return 'Unverified';
    }
    if (expiresAt === 0) {
      return 'Permanent';
    }
    const now = nowSeconds ?? Math.floor(Date.now() / 1000);
    if (expiresAt <= now) {
      return 'Expired';
    }
    if (expiresAt <= now + this.warningHorizonSeconds) {
      return 'ExpiringSoon';
    }
    return 'Active';
  }

  /**
   * Evaluate a single account record.
   */
  public evaluateAccount(record: KycAccountRecord, nowSeconds?: number): KycAccountEvaluation {
    const now = nowSeconds ?? Math.floor(Date.now() / 1000);
    const status = this.classify(record.expiresAt, now);

    let secondsRemaining: number | null = null;
    let daysRemaining: number | null = null;

    if (record.expiresAt !== undefined && record.expiresAt !== null && record.expiresAt > 0) {
      const diff = record.expiresAt - now;
      secondsRemaining = diff;
      daysRemaining = Math.max(0, Math.floor(diff / 86400));
    }

    const isCompliant = status === 'Active' || status === 'Permanent';
    const needsRenewal = status === 'ExpiringSoon' || status === 'Expired';

    return {
      address: record.address,
      status,
      expiresAt: record.expiresAt ?? null,
      secondsRemaining,
      daysRemaining,
      isCompliant,
      needsRenewal,
      level: record.level,
    };
  }

  /**
   * Evaluate a collection of account records and generate an aggregate compliance summary.
   */
  public evaluateAccounts(records: KycAccountRecord[], nowSeconds?: number): KycAuditSummary {
    const now = nowSeconds ?? Math.floor(Date.now() / 1000);
    let permanent = 0;
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    let unverified = 0;

    for (const rec of records) {
      const status = this.classify(rec.expiresAt, now);
      switch (status) {
        case 'Permanent':
          permanent++;
          break;
        case 'Active':
          active++;
          break;
        case 'ExpiringSoon':
          expiringSoon++;
          break;
        case 'Expired':
          expired++;
          break;
        case 'Unverified':
          unverified++;
          break;
      }
    }

    const total = records.length;
    const compliantCount = permanent + active;
    const complianceRate = total > 0 ? Number(((compliantCount / total) * 100).toFixed(2)) : 0;

    return {
      total,
      permanent,
      active,
      expiringSoon,
      expired,
      unverified,
      complianceRate,
      evaluatedAt: now,
    };
  }

  /**
   * Filter accounts requiring attention (ExpiringSoon or Expired).
   */
  public getRenewalAlerts(records: KycAccountRecord[], nowSeconds?: number): KycRenewalAlert[] {
    const now = nowSeconds ?? Math.floor(Date.now() / 1000);
    const alerts: KycRenewalAlert[] = [];

    for (const rec of records) {
      const evalResult = this.evaluateAccount(rec, now);
      if (evalResult.status === 'ExpiringSoon' && evalResult.expiresAt !== null) {
        alerts.push({
          address: rec.address,
          status: 'ExpiringSoon',
          severity: 'warning',
          expiresAt: evalResult.expiresAt,
          daysRemaining: evalResult.daysRemaining ?? 0,
          message: `KYC attestation for ${rec.address.slice(0, 8)}... expires in ${evalResult.daysRemaining} days`,
        });
      } else if (evalResult.status === 'Expired' && evalResult.expiresAt !== null) {
        alerts.push({
          address: rec.address,
          status: 'Expired',
          severity: 'critical',
          expiresAt: evalResult.expiresAt,
          daysRemaining: 0,
          message: `KYC attestation for ${rec.address.slice(0, 8)}... expired and requires immediate re-verification`,
        });
      }
    }

    return alerts.sort((a, b) => a.expiresAt - b.expiresAt);
  }
}
