/**
 * dlqManager.ts
 *
 * Webhook Dead Letter Queue (DLQ) telemetry and replay batch manager.
 */

import { DeadLetterDelivery } from '../server/webhooks.js';

export interface DlqMetrics {
  totalItems: number;
  oldestFailureTimestamp: number | null;
  newestFailureTimestamp: number | null;
  failureReasons: Record<string, number>;
}

export class WebhookDeadLetterQueueManager {
  /**
   * Aggregates DLQ metrics and common failure reasons.
   */
  public static getMetrics(items: DeadLetterDelivery[]): DlqMetrics {
    if (items.length === 0) {
      return {
        totalItems: 0,
        oldestFailureTimestamp: null,
        newestFailureTimestamp: null,
        failureReasons: {},
      };
    }

    let oldest = items[0].failedAt;
    let newest = items[0].failedAt;
    const reasons: Record<string, number> = {};

    for (const item of items) {
      if (item.failedAt < oldest) oldest = item.failedAt;
      if (item.failedAt > newest) newest = item.failedAt;

      const reason = item.error ? item.error.slice(0, 50) : 'Unknown Error';
      reasons[reason] = (reasons[reason] || 0) + 1;
    }

    return {
      totalItems: items.length,
      oldestFailureTimestamp: oldest,
      newestFailureTimestamp: newest,
      failureReasons: reasons,
    };
  }

  /**
   * Filter DLQ items by target webhook subscription ID.
   */
  public static filterBySubscription(items: DeadLetterDelivery[], subscriptionId: string): DeadLetterDelivery[] {
    return items.filter((i) => i.subscriptionId === subscriptionId);
  }

  /**
   * Filter DLQ items by search keyword in error string or destination URL.
   */
  public static filterBySearch(items: DeadLetterDelivery[], keyword: string): DeadLetterDelivery[] {
    if (!keyword) return items;
    const clean = keyword.toLowerCase();
    return items.filter(
      (i) => i.url.toLowerCase().includes(clean) || i.error.toLowerCase().includes(clean)
    );
  }

  /**
   * Partitions DLQ queue into a batch for replay and the remaining items.
   */
  public static prepareReplayBatch(
    items: DeadLetterDelivery[],
    maxBatchSize = 50
  ): { replayable: DeadLetterDelivery[]; remaining: DeadLetterDelivery[] } {
    const replayable = items.slice(0, maxBatchSize);
    const remaining = items.slice(maxBatchSize);
    return { replayable, remaining };
  }
}
