import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EscrowFinancialAggregator } from '../src/sdk/escrowAggregator';
import { StoredEscrow } from '../src/server/store';

describe('EscrowFinancialAggregator Unit Tests', () => {
  const dummyEscrows: StoredEscrow[] = [
    {
      id: 'esc-1',
      escrowIndex: 1,
      amount: '500000000', // 50 XLM
      token: 'XLM',
      sender: 'GB_SENDER_1',
      recipient: 'GB_REC_1',
      expiresAt: 2000,
      status: 'Pending',
    },
    {
      id: 'esc-2',
      escrowIndex: 2,
      amount: '300000000', // 30 XLM
      token: 'XLM',
      sender: 'GB_SENDER_1',
      recipient: 'GB_REC_2',
      expiresAt: 2200,
      status: 'Disputed', // Disputed counts towards locked collateral
    },
    {
      id: 'esc-3',
      escrowIndex: 3,
      amount: '1000000000', // 100 USDC
      token: 'USDC',
      sender: 'GB_SENDER_2',
      recipient: 'GB_REC_1',
      expiresAt: 1500,
      status: 'Released',
    },
    {
      id: 'esc-4',
      escrowIndex: 4,
      amount: '200000000', // 20 USDC
      token: 'USDC',
      sender: 'GB_SENDER_2',
      recipient: 'GB_REC_3',
      expiresAt: 1400,
      status: 'Refunded',
    },
  ];

  it('aggregates total locked and settled volume accurately', () => {
    const now = 1000;
    const metrics = EscrowFinancialAggregator.aggregate(dummyEscrows, now);

    assert.equal(metrics.totalEscrows, 4);
    assert.equal(metrics.statusCounts.Pending, 1);
    assert.equal(metrics.statusCounts.Disputed, 1);
    assert.equal(metrics.statusCounts.Released, 1);
    assert.equal(metrics.statusCounts.Refunded, 1);

    // Locked: esc-1 (500000000) + esc-2 (300000000) = 800000000
    assert.equal(metrics.totalVolumeLocked, 800000000n);
    // Settled: esc-3 (1000000000) + esc-4 (200000000) = 1200000000
    assert.equal(metrics.totalVolumeSettled, 1200000000n);
  });

  it('groups volume and count by token cleanly', () => {
    const metrics = EscrowFinancialAggregator.aggregate(dummyEscrows, 1000);

    const xlm = metrics.tokenBreakdown['XLM'];
    assert.ok(xlm);
    assert.equal(xlm.escrowCount, 2);
    assert.equal(xlm.totalVolume, 800000000n);
    assert.equal(xlm.pendingVolume, 800000000n);
    assert.equal(xlm.settledVolume, 0n);

    const usdc = metrics.tokenBreakdown['USDC'];
    assert.ok(usdc);
    assert.equal(usdc.escrowCount, 2);
    assert.equal(usdc.totalVolume, 1200000000n);
    assert.equal(usdc.pendingVolume, 0n);
    assert.equal(usdc.settledVolume, 1200000000n);
  });

  it('calculates average pending timelock remaining accurately', () => {
    // Current time = 1000.
    // Pending: esc-1 expiresAt=2000 (remaining: 1000s)
    // Disputed: esc-2 expiresAt=2200 (remaining: 1200s)
    // Average remaining = (1000 + 1200) / 2 = 1100s
    const metrics = EscrowFinancialAggregator.aggregate(dummyEscrows, 1000);
    assert.equal(metrics.averagePendingTimelockRemainingSeconds, 1100);
  });

  it('sorts top senders and recipients by volume descending', () => {
    const metrics = EscrowFinancialAggregator.aggregate(dummyEscrows, 1000);

    // Senders:
    // GB_SENDER_2: 1000000000 + 200000000 = 1200000000
    // GB_SENDER_1: 500000000 + 300000000 = 800000000
    assert.equal(metrics.topSendersByVolume[0].address, 'GB_SENDER_2');
    assert.equal(metrics.topSendersByVolume[0].totalVolume, 1200000000n);
    assert.equal(metrics.topSendersByVolume[1].address, 'GB_SENDER_1');
    assert.equal(metrics.topSendersByVolume[1].totalVolume, 800000000n);

    // Recipients:
    // GB_REC_1: 500000000 (XLM) + 1000000000 (USDC) = 1500000000
    assert.equal(metrics.topRecipientsByVolume[0].address, 'GB_REC_1');
    assert.equal(metrics.topRecipientsByVolume[0].totalVolume, 1500000000n);
  });

  it('handles empty escrow lists and corrupted amounts gracefully', () => {
    const emptyMetrics = EscrowFinancialAggregator.aggregate([]);
    assert.equal(emptyMetrics.totalEscrows, 0);
    assert.equal(emptyMetrics.totalVolumeLocked, 0n);
    assert.equal(emptyMetrics.averagePendingTimelockRemainingSeconds, 0);
    assert.equal(emptyMetrics.topSendersByVolume.length, 0);

    const corruptEscrows: StoredEscrow[] = [
      {
        id: 'bad-1',
        escrowIndex: 99,
        amount: 'not-a-number',
        token: 'XLM',
        sender: 'GB_SENDER',
        recipient: 'GB_REC',
        expiresAt: 500,
        status: 'Pending',
      },
    ];
    const corruptMetrics = EscrowFinancialAggregator.aggregate(corruptEscrows, 1000);
    assert.equal(corruptMetrics.totalVolumeLocked, 0n);
    assert.equal(corruptMetrics.averagePendingTimelockRemainingSeconds, 0);
  });
});
