/**
 * ws.ts
 *
 * Real-time WebSocket compliance event broadcaster for Safeguard on Stellar.
 * Streams transaction lifecycle events, escrow state changes, and arbitration alerts to connected clients.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { EventEmitter } from 'events';

export type ComplianceEventType =
  | 'payment_approved'
  | 'escrow_created'
  | 'escrow_released'
  | 'escrow_refunded'
  | 'escrow_disputed'
  | 'escrow_arbitrated';

export interface ComplianceEventPayload {
  type: ComplianceEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export class ComplianceBroadcaster extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  constructor() {
    super();
  }

  public attach(server: Server, path = '/ws/compliance'): void {
    this.wss = new WebSocketServer({ server, path });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      // Send initial welcome/handshake envelope
      ws.send(
        JSON.stringify({
          type: 'connection_established',
          timestamp: Date.now(),
          protocol: 'safeguard-compliance-v1',
        })
      );

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', () => {
        this.clients.delete(ws);
      });
    });
  }

  public broadcast(type: ComplianceEventType, data: Record<string, unknown>): ComplianceEventPayload {
    const payload: ComplianceEventPayload = {
      type,
      timestamp: Date.now(),
      data,
    };

    const message = JSON.stringify(payload);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }

    this.emit('broadcast', payload);
    return payload;
  }

  public getConnectedClientCount(): number {
    return this.clients.size;
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      for (const client of this.clients) {
        try {
          client.terminate();
        } catch {}
      }
      this.clients.clear();

      if (this.wss) {
        this.wss.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

export const complianceBroadcaster = new ComplianceBroadcaster();
