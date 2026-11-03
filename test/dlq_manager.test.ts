import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WebhookDeadLetterQueueManager } from '../src/sdk/dlqManager';
import { DeadLetterDelivery } from '../src/server/webhooks';

describe('WebhookDeadLetterQueueManager Unit Tests', () => {
  const dummyItems: DeadLetterDelivery[] = [
    {
      event: { event: 'payment.settled', timestamp: 1000, data: {} },
      subscriptionId: 'sub-1',
      url: 'https://api.merchant.com/webhook',
      error: 'HTTP 500 Internal Server Error',
      failedAt: 1050,
      retryCount: 3,
    },
    {
      event: { event: 'escrow.disputed', timestamp: 2000, data: {} },
      subscriptionId: 'sub-2',
      url: 'https://audit.partner.org/notify',
      error: 'ETIMEDOUT connection timeout',
      failedAt: 2080,
      retryCount: 3,
    },
    {
      event: { event: 'payment.blocked', timestamp: 3000, data: {} },
      subscriptionId: 'sub-1',
      url: 'https://api.merchant.com/webhook',
      error: 'HTTP 502 Bad Gateway',
      failedAt: 3090,
      retryCount: 3,
    },
  ];

  it('aggregates DLQ metrics and failure reasons accurately', () => {
    const metrics = WebhookDeadLetterQueueManager.getMetrics(dummyItems);
    assert.equal(metrics.totalItems, 3);
    assert.equal(metrics.oldestFailureTimestamp, 1050);
    assert.equal(metrics.newestFailureTimestamp, 3090);
    assert.equal(metrics.failureReasons['HTTP 500 Internal Server Error'], 1);
    assert.equal(metrics.failureReasons['ETIMEDOUT connection timeout'], 1);

    const empty = WebhookDeadLetterQueueManager.getMetrics([]);
    assert.equal(empty.totalItems, 0);
    assert.equal(empty.oldestFailureTimestamp, null);
  });

  it('filters DLQ items by subscription ID', () => {
    const sub1 = WebhookDeadLetterQueueManager.filterBySubscription(dummyItems, 'sub-1');
    assert.equal(sub1.length, 2);
    assert.equal(sub1[0].subscriptionId, 'sub-1');
    assert.equal(sub1[1].subscriptionId, 'sub-1');

    const subNone = WebhookDeadLetterQueueManager.filterBySubscription(dummyItems, 'unknown');
    assert.equal(subNone.length, 0);
  });

  it('filters DLQ items by search keyword in URL or error message', () => {
    const timeoutItems = WebhookDeadLetterQueueManager.filterBySearch(dummyItems, 'timeout');
    assert.equal(timeoutItems.length, 1);
    assert.equal(timeoutItems[0].subscriptionId, 'sub-2');

    const merchantItems = WebhookDeadLetterQueueManager.filterBySearch(dummyItems, 'merchant');
    assert.equal(merchantItems.length, 2);

    const all = WebhookDeadLetterQueueManager.filterBySearch(dummyItems, '');
    assert.equal(all.length, 3);
  });

  it('partitions DLQ queue into replay batches', () => {
    const { replayable, remaining } = WebhookDeadLetterQueueManager.prepareReplayBatch(dummyItems, 2);
    assert.equal(replayable.length, 2);
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].subscriptionId, 'sub-1');
  });
});
