import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { KycExpirationMonitor, type KycAccountRecord } from '../src/sdk/kycMonitor';

describe('KycExpirationMonitor Unit Tests', () => {
  const BASE_TIME = 1_800_000_000; // Reference epoch seconds
  const monitor = new KycExpirationMonitor(7 * 24 * 3600); // 7-day warning window

  it('correctly classifies KYC records across all lifecycle states', () => {
    // Permanent (expiresAt === 0)
    assert.equal(monitor.classify(0, BASE_TIME), 'Permanent');

    // Unverified (undefined or null)
    assert.equal(monitor.classify(undefined, BASE_TIME), 'Unverified');
    assert.equal(monitor.classify(null, BASE_TIME), 'Unverified');

    // Expired (timestamp in the past)
    assert.equal(monitor.classify(BASE_TIME - 3600, BASE_TIME), 'Expired');
    assert.equal(monitor.classify(BASE_TIME, BASE_TIME), 'Expired');

    // Expiring soon (within 7 days)
    const threeDaysFuture = BASE_TIME + 3 * 24 * 3600;
    assert.equal(monitor.classify(threeDaysFuture, BASE_TIME), 'ExpiringSoon');

    // Active (beyond 7 days)
    const thirtyDaysFuture = BASE_TIME + 30 * 24 * 3600;
    assert.equal(monitor.classify(thirtyDaysFuture, BASE_TIME), 'Active');
  });

  it('evaluates individual account records with accurate days and compliance flags', () => {
    const record: KycAccountRecord = {
      address: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
      expiresAt: BASE_TIME + 4 * 24 * 3600, // 4 days remaining
      level: 2,
    };

    const evaluation = monitor.evaluateAccount(record, BASE_TIME);
    assert.equal(evaluation.status, 'ExpiringSoon');
    assert.equal(evaluation.isCompliant, false);
    assert.equal(evaluation.needsRenewal, true);
    assert.equal(evaluation.daysRemaining, 4);
    assert.equal(evaluation.secondsRemaining, 4 * 24 * 3600);
    assert.equal(evaluation.level, 2);
  });

  it('calculates audit summaries and compliance rate correctly', () => {
    const dataset: KycAccountRecord[] = [
      { address: 'ADDR1', expiresAt: 0 }, // Permanent
      { address: 'ADDR2', expiresAt: BASE_TIME + 40 * 86400 }, // Active
      { address: 'ADDR3', expiresAt: BASE_TIME + 2 * 86400 }, // ExpiringSoon
      { address: 'ADDR4', expiresAt: BASE_TIME - 100 }, // Expired
      { address: 'ADDR5', expiresAt: undefined }, // Unverified
    ];

    const summary = monitor.evaluateAccounts(dataset, BASE_TIME);
    assert.equal(summary.total, 5);
    assert.equal(summary.permanent, 1);
    assert.equal(summary.active, 1);
    assert.equal(summary.expiringSoon, 1);
    assert.equal(summary.expired, 1);
    assert.equal(summary.unverified, 1);
    // Compliant = permanent (1) + active (1) = 2 out of 5 = 40.0%
    assert.equal(summary.complianceRate, 40.0);
  });

  it('generates prioritized renewal alerts with warning and critical severities', () => {
    const dataset: KycAccountRecord[] = [
      { address: 'ADDR_EXPIRED', expiresAt: BASE_TIME - 86400 },
      { address: 'ADDR_EXPIRING_3D', expiresAt: BASE_TIME + 3 * 86400 },
      { address: 'ADDR_ACTIVE', expiresAt: BASE_TIME + 90 * 86400 },
      { address: 'ADDR_PERM', expiresAt: 0 },
    ];

    const alerts = monitor.getRenewalAlerts(dataset, BASE_TIME);
    assert.equal(alerts.length, 2);

    // Sorted by earliest expiration
    assert.equal(alerts[0].address, 'ADDR_EXPIRED');
    assert.equal(alerts[0].severity, 'critical');
    assert.equal(alerts[0].status, 'Expired');

    assert.equal(alerts[1].address, 'ADDR_EXPIRING_3D');
    assert.equal(alerts[1].severity, 'warning');
    assert.equal(alerts[1].status, 'ExpiringSoon');
    assert.equal(alerts[1].daysRemaining, 3);
  });
});
