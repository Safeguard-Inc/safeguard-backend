import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AuditReportGenerator,
  type AuditReportMetadata,
  type AuditReportMetrics,
} from '../src/sdk/auditReportGenerator';

describe('AuditReportGenerator Unit Tests', () => {
  const generator = new AuditReportGenerator();

  const mockMeta: AuditReportMetadata = {
    reportId: 'REP-2026-Q4-001',
    organizationName: 'Safeguard Enterprise Org',
    network: 'stellar-testnet',
    generatedAt: '2026-11-03T14:00:00Z',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    policyContractId: 'CCONTR_POL_123',
    paymentContractId: 'CCONTR_PAY_456',
  };

  const mockMetrics: AuditReportMetrics = {
    totalTransactionsEvaluated: 1500,
    approvedTransactions: 1420,
    escrowedTransactions: 70,
    blockedTransactions: 10,
    approvalRatePercent: 94.67,
    sanctionsChecksPerformed: 1500,
    sanctionsHitsBlocked: 0,
    totalVolumeXlm: '450000.50',
    activeEscrowsRemaining: 12,
  };

  it('computes deterministic SHA-256 hash across identical metadata and metrics', () => {
    const hash1 = AuditReportGenerator.computeCertificateHash({ metadata: mockMeta, metrics: mockMetrics });
    const hash2 = AuditReportGenerator.computeCertificateHash({ metadata: { ...mockMeta }, metrics: { ...mockMetrics } });

    assert.equal(typeof hash1, 'string');
    assert.equal(hash1.length, 64);
    assert.equal(hash1, hash2);

    // Minor change alters checksum
    const hash3 = AuditReportGenerator.computeCertificateHash({
      metadata: mockMeta,
      metrics: { ...mockMetrics, approvedTransactions: 1421 },
    });
    assert.notEqual(hash1, hash3);
  });

  it('evaluates compliance status accurately across metric variations', () => {
    // 94.67% approval and 0 sanctions hits -> COMPLIANT
    assert.equal(AuditReportGenerator.evaluateCertificateStatus(mockMetrics), 'COMPLIANT');

    // 75% approval -> FLAGGED
    assert.equal(
      AuditReportGenerator.evaluateCertificateStatus({ ...mockMetrics, approvalRatePercent: 75 }),
      'FLAGGED'
    );

    // 50% approval -> NON_COMPLIANT
    assert.equal(
      AuditReportGenerator.evaluateCertificateStatus({ ...mockMetrics, approvalRatePercent: 50 }),
      'NON_COMPLIANT'
    );
  });

  it('generates certificate and formats compliant markdown document', () => {
    const cert = generator.generateCertificate(mockMeta, mockMetrics);
    assert.equal(cert.status, 'COMPLIANT');
    assert.equal(cert.metadata.reportId, 'REP-2026-Q4-001');

    const md = generator.formatMarkdownReport(cert);
    assert.match(md, /# Stellar On-Chain Compliance Audit Certificate/);
    assert.match(md, /REP-2026-Q4-001/);
    assert.match(md, /COMPLIANT/);
    assert.match(md, /450000.50 XLM/);
    assert.match(md, /CCONTR_POL_123/);
  });
});
