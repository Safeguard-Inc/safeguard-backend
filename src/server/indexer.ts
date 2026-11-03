/**
 * indexer.ts
 *
 * Soroban RPC Event Ingestion Daemon for Safeguard smart contracts.
 * Polls getEvents from the Stellar Testnet RPC, parses compliance events,
 * and updates the persistent data store.
 */

import { rpc, scValToNative } from '@stellar/stellar-sdk';
import { DataStore, defaultStore } from './store.js';

export interface IndexerStatus {
  active: boolean;
  rpcEndpoint: string;
  contractId: string;
  lastLedger: number;
  eventsProcessed: number;
  lastSyncTime: number | null;
  healthy: boolean;
  consecutiveErrors?: number;
  currentIntervalMs?: number;
}

export class SorobanIndexer {
  private rpcServer: rpc.Server;
  private contractId: string;
  private store: DataStore;
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private lastLedger = 0;
  private eventsProcessed = 0;
  private lastSyncTime: number | null = null;
  private healthy = true;
  private consecutiveErrors = 0;
  private baseRetryMs = 2_000;
  private maxRetryMs = 60_000;
  private pollIntervalMs = 15_000;

  constructor(
    rpcEndpoint = 'https://soroban-testnet.stellar.org',
    contractId = 'CDC6KVX7QT7CD3GOVGX44NQUNS7FMSZKIAXTV3TDGSXQKJRQMDZRSRCN',
    store: DataStore = defaultStore
  ) {
    this.rpcServer = new rpc.Server(rpcEndpoint, { allowHttp: false });
    this.contractId = contractId;
    this.store = store;
  }

  public async start(pollIntervalMs = 15_000): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const latest = await this.rpcServer.getLatestLedger();
      this.lastLedger = Math.max(1, latest.sequence - 100);
      this.healthy = true;
    } catch {
      this.lastLedger = 5_000_000;
      this.healthy = false;
    }

    const poll = async () => {
      if (!this.isRunning) return;
      await this.syncEvents();
      if (this.isRunning) {
        this.timer = setTimeout(poll, pollIntervalMs);
      }
    };

    poll();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public async syncEvents(): Promise<number> {
    try {
      const latest = await this.rpcServer.getLatestLedger();
      const currentSequence = latest.sequence;
      if (currentSequence <= this.lastLedger) {
        this.lastSyncTime = Date.now();
        this.healthy = true;
        return 0;
      }

      const start = Math.max(this.lastLedger + 1, currentSequence - 200);
      const res = await this.rpcServer.getEvents({
        startLedger: start,
        filters: [
          {
            type: 'contract',
            contractIds: [this.contractId],
          },
        ],
      });

      this.lastLedger = currentSequence;
      this.lastSyncTime = Date.now();
      this.healthy = true;
      this.consecutiveErrors = 0;

      if (!res.events || res.events.length === 0) {
        return 0;
      }

      let count = 0;
      for (const ev of res.events) {
        this.processEvent(ev);
        count++;
      }
      this.eventsProcessed += count;
      return count;
    } catch (err) {
      this.consecutiveErrors++;
      this.healthy = false;
      return 0;
    }
  }

  private processEvent(event: any): void {
    try {
      const topics: string[] = [];
      if (Array.isArray(event.topic)) {
        for (const t of event.topic) {
          try {
            const parsed = scValToNative(t);
            topics.push(String(parsed));
          } catch {}
        }
      }

      const txHash = event.txHash || (event.id ? String(event.id) : undefined);
      const ledger = event.ledger;

      if (topics.includes('escrow_held') || topics.includes('pay_block')) {
        this.store.addTransaction({
          id: `tx-chain-${ledger}-${this.eventsProcessed}`,
          sender: 'On-Chain Event',
          recipient: 'Safeguard Vault',
          token: 'XLM SAC',
          amount: 'On-Chain',
          status: topics.includes('pay_block') ? 'Blocked' : 'Escrowed',
          reason: `Indexed contract event: ${topics.join(' / ')}`,
          timestamp: Date.now(),
          txHash,
          ledger,
        });
      }
    } catch {}
  }

  public getBackoffDelay(errors: number): number {
    if (errors <= 0) return this.pollIntervalMs;
    const delay = this.baseRetryMs * Math.pow(2, errors - 1);
    return Math.min(this.maxRetryMs, delay);
  }

  public getStatus(): IndexerStatus {
    return {
      active: this.isRunning,
      rpcEndpoint: 'https://soroban-testnet.stellar.org',
      contractId: this.contractId,
      lastLedger: this.lastLedger,
      eventsProcessed: this.eventsProcessed,
      lastSyncTime: this.lastSyncTime,
      healthy: this.healthy,
      consecutiveErrors: this.consecutiveErrors,
      currentIntervalMs: this.healthy ? this.pollIntervalMs : this.getBackoffDelay(this.consecutiveErrors),
    };
  }
}

export const defaultIndexer = new SorobanIndexer();
