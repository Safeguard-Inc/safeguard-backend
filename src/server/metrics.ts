/**
 * metrics.ts
 *
 * Prometheus text format exporter for Safeguard system metrics.
 * Exports HTTP request counters, simulation verdict counters,
 * active escrows gauges, and storage counts.
 */

import { defaultStore } from './store.js';

export class MetricsCollector {
  private httpRequestsTotal: Map<string, number> = new Map();
  private simulationTotal: Map<string, number> = new Map();

  public recordRequest(method: string, status: number): void {
    const key = `method="${method}",status="${status}"`;
    this.httpRequestsTotal.set(key, (this.httpRequestsTotal.get(key) || 0) + 1);
  }

  public recordSimulation(decision: string): void {
    this.simulationTotal.set(decision, (this.simulationTotal.get(decision) || 0) + 1);
  }

  public exportMetrics(): string {
    const stats = defaultStore.getComplianceStats();
    const lines: string[] = [];

    // HELP and TYPE declarations
    lines.push('# HELP safeguard_http_requests_total Total HTTP requests handled');
    lines.push('# TYPE safeguard_http_requests_total counter');
    if (this.httpRequestsTotal.size === 0) {
      lines.push('safeguard_http_requests_total{method="GET",status="200"} 0');
    } else {
      for (const [labels, val] of this.httpRequestsTotal.entries()) {
        lines.push(`safeguard_http_requests_total{${labels}} ${val}`);
      }
    }

    lines.push('# HELP safeguard_simulations_total Total pre-flight payment simulations by decision');
    lines.push('# TYPE safeguard_simulations_total counter');
    for (const decision of ['APPROVE', 'FLAG', 'BLOCK']) {
      const count = this.simulationTotal.get(decision) || 0;
      lines.push(`safeguard_simulations_total{decision="${decision}"} ${count}`);
    }

    lines.push('# HELP safeguard_compliance_transactions_total Total recorded compliance transactions');
    lines.push('# TYPE safeguard_compliance_transactions_total counter');
    lines.push(`safeguard_compliance_transactions_total{status="approved"} ${stats.approvedCount}`);
    lines.push(`safeguard_compliance_transactions_total{status="escrowed"} ${stats.escrowedCount}`);
    lines.push(`safeguard_compliance_transactions_total{status="blocked"} ${stats.blockedCount}`);

    lines.push('# HELP safeguard_escrows_active Current active pending escrow count');
    lines.push('# TYPE safeguard_escrows_active gauge');
    lines.push(`safeguard_escrows_active ${stats.pendingEscrows}`);

    lines.push('# HELP safeguard_compliance_approval_ratio Compliance approval percentage ratio');
    lines.push('# TYPE safeguard_compliance_approval_ratio gauge');
    lines.push(`safeguard_compliance_approval_ratio ${stats.approvalRatePercent}`);

    lines.push('# HELP safeguard_process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE safeguard_process_uptime_seconds gauge');
    lines.push(`safeguard_process_uptime_seconds ${Math.floor(process.uptime())}`);

    return lines.join('\n') + '\n';
  }
}

export const metricsCollector = new MetricsCollector();
