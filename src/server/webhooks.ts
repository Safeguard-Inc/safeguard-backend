/**
 * webhooks.ts
 *
 * Real-time event notification dispatcher for Safeguard compliance events.
 * Dispatches HMAC-SHA256 signed payloads to external webhooks on escrow creation,
 * release, refund, and policy blocks.
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
  events: WebhookEventType[] | ['*'];
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
}

export class WebhookDispatcher {
  private subscriptions: Map<string, WebhookSubscription> = new Map();

  /**
   * Register a new webhook listener.
   */
  public register(sub: Omit<WebhookSubscription, 'createdAt'> & { createdAt?: number }): WebhookSubscription {
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
    if (subscription.events.includes('*' as any)) return true;
    return subscription.events.includes(eventType);
  }

  /**
   * Dispatch an event to all matching subscriptions.
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
        });
      } catch (err: any) {
        results.push({
          subscriptionId: sub.id,
          url: sub.url,
          status: err.message || 'NetworkError',
          success: false,
          timestamp: Date.now(),
        });
      }
    }

    return results;
  }
}

export const defaultDispatcher = new WebhookDispatcher();
