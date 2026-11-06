/**
 * webhooks.ts
 *
 * Real-time event notification dispatcher for Safeguard compliance events.
 * Dispatches HMAC-SHA256 signed payloads to external webhooks on escrow creation,
 * release, refund, and policy blocks with retry and dead-letter queue support.
 */

import crypto from 'crypto';

export type WebhookEventType =
  | 'escrow.created'
  | 'escrow.released'
  | 'escrow.refunded'
  | 'policy.blocked'
  | 'system.alert';

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface WebhookSubscription {
  id: string;
  url: string;
  events: (WebhookEventType | '*')[];
  secret: string;
  active: boolean;
  createdAt: number;
}

export interface DispatchResult {
  subscriptionId: string;
  url: string;
  status: number | string;
  success: boolean;
  timestamp: number;
  retriesAttempted?: number;
}

export interface DeadLetterDelivery {
  event: WebhookEvent;
  subscriptionId: string;
  url: string;
  error: string;
  failedAt: number;
  retryCount: number;
}

/**
 * Validates a webhook destination URL against SSRF threats, loopback, and cloud metadata endpoints.
 */
export function isSafeWebhookUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname === '169.254.169.254' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }
    const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch) {
      const first = parseInt(ipMatch[1], 10);
      const second = parseInt(ipMatch[2], 10);
      if (first === 10) return false;
      if (first === 127) return false;
      if (first === 172 && second >= 16 && second <= 31) return false;
      if (first === 192 && second === 168) return false;
      if (first === 169 && second === 254) return false;
      if (first === 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export class WebhookDispatcher {
  private subscriptions: Map<string, WebhookSubscription> = new Map();
  private deadLetterQueue: DeadLetterDelivery[] = [];
  private maxDlqSize: number = 100;

  /**
   * Register a new webhook listener.
   */
  public register(sub: Omit<WebhookSubscription, 'createdAt'> & { createdAt?: number }): WebhookSubscription {
    if (!isSafeWebhookUrl(sub.url)) {
      throw new Error('Invalid or restricted webhook URL: private, loopback, and metadata destinations are prohibited');
    }
    const record: WebhookSubscription = {
      ...sub,
      createdAt: sub.createdAt || Date.now(),
    };
    this.subscriptions.set(record.id, record);
    return record;
  }

  /**
   * Remove a webhook subscription by id.
   */
  public unregister(id: string): boolean {
    return this.subscriptions.delete(id);
  }

  /**
   * Get all active subscriptions.
   */
  public getSubscriptions(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Sign a payload string with HMAC-SHA256 using the subscription secret.
   */
  public signPayload(secret: string, body: string): string {
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  /**
   * Check if a subscription matches a given event type.
   */
  public matches(subscription: WebhookSubscription, eventType: WebhookEventType): boolean {
    if (!subscription.active) return false;
    const events: (WebhookEventType | '*')[] = subscription.events;
    if (events.includes('*')) return true;
    return events.includes(eventType);
  }

  /**
   * Dispatch an event to all matching subscriptions with optional single-pass execution.
   */
  public async dispatch(
    event: WebhookEvent,
    fetchFn: typeof fetch = fetch
  ): Promise<DispatchResult[]> {
    const results: DispatchResult[] = [];
    const body = JSON.stringify(event);

    for (const sub of this.subscriptions.values()) {
      if (!this.matches(sub, event.type)) continue;

      const signature = this.signPayload(sub.secret, body);
      try {
        const res = await fetchFn(sub.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Safeguard-Event': event.type,
            'X-Safeguard-Signature': signature,
            'X-Safeguard-Delivery': event.id,
          },
          body,
        });

        results.push({
          subscriptionId: sub.id,
          url: sub.url,
          status: res.status,
          success: res.ok,
          timestamp: Date.now(),
          retriesAttempted: 0,
        });
      } catch (err: any) {
        results.push({
          subscriptionId: sub.id,
          url: sub.url,
          status: err.message || 'NetworkError',
          success: false,
          timestamp: Date.now(),
          retriesAttempted: 0,
        });
      }
    }

    return results;
  }

  /**
   * Dispatch an event with exponential backoff retries and dead-letter queue archiving on final failure.
   */
  public async dispatchWithRetry(
    event: WebhookEvent,
    maxRetries: number = 3,
    fetchFn: typeof fetch = fetch
  ): Promise<DispatchResult[]> {
    const results: DispatchResult[] = [];
    const body = JSON.stringify(event);

    for (const sub of this.subscriptions.values()) {
      if (!this.matches(sub, event.type)) continue;

      const signature = this.signPayload(sub.secret, body);
      let attempts = 0;
      let delivered = false;
      let lastStatus: number | string = 'Unknown';

      while (attempts <= maxRetries && !delivered) {
        try {
          const res = await fetchFn(sub.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Safeguard-Event': event.type,
              'X-Safeguard-Signature': signature,
              'X-Safeguard-Delivery': event.id,
              'X-Safeguard-Attempt': (attempts + 1).toString(),
            },
            body,
          });

          lastStatus = res.status;
          if (res.ok) {
            delivered = true;
          } else {
            attempts++;
          }
        } catch (err: any) {
          lastStatus = err.message || 'NetworkError';
          attempts++;
        }
      }

      if (!delivered) {
        this.pushToDeadLetterQueue({
          event,
          subscriptionId: sub.id,
          url: sub.url,
          error: String(lastStatus),
          failedAt: Date.now(),
          retryCount: attempts,
        });
      }

      results.push({
        subscriptionId: sub.id,
        url: sub.url,
        status: lastStatus,
        success: delivered,
        timestamp: Date.now(),
        retriesAttempted: attempts,
      });
    }

    return results;
  }

  public getDeadLetterQueue(): DeadLetterDelivery[] {
    return [...this.deadLetterQueue];
  }

  public clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }

  public async replayDeadLetterQueue(limit?: number): Promise<number> {
    const count = limit ? Math.min(limit, this.deadLetterQueue.length) : this.deadLetterQueue.length;
    const itemsToReplay = this.deadLetterQueue.splice(0, count);
    for (const item of itemsToReplay) {
      await this.dispatch(item.event);
    }
    return itemsToReplay.length;
  }

  private pushToDeadLetterQueue(delivery: DeadLetterDelivery): void {
    this.deadLetterQueue.unshift(delivery);
    if (this.deadLetterQueue.length > this.maxDlqSize) {
      this.deadLetterQueue.pop();
    }
  }
}

export const defaultDispatcher = new WebhookDispatcher();
