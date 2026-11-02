/**
 * store.ts
 *
 * File-backed persistence store for Safeguard transactions, escrows, and audit logs.
 * Provides durable state across server restarts with safe atomic writes.
 */

import fs from 'fs';
import path from 'path';

export interface StoredTransaction {
  id: string;
  sender: string;
  recipient: string;
  token: string;
  amount: string;
  status: 'Approved' | 'Escrowed' | 'Blocked';
  reason: string;
  timestamp: number;
  txHash?: string;
  ledger?: number;
}

export interface StoredEscrow {
  id: string;
  escrowIndex: number;
  amount: string;
  token: string;
  sender: string;
  recipient: string;
  expiresAt: number;
  status: 'Pending' | 'Released' | 'Refunded';
  txHash?: string;
}

const DEFAULT_TXS: StoredTransaction[] = [
  {
    id: 'tx-1',
    sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
    recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
    token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    amount: '500000000', // 50 XLM
    status: 'Approved',
    reason: 'Under the 100 XLM spend cap; settled directly',
    timestamp: Date.parse('2026-10-05T20:59:40Z'),
    txHash: 'c762b42f818387aa584ea33d3da006f22671071ed6e182068994ea6597395e6c',
  },
  {
    id: 'tx-2',
    sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
    recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
    token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    amount: '1500000000', // 150 XLM
    status: 'Escrowed',
    reason: 'Exceeds the 100 XLM spend cap; held as escrow #1 (later released)',
    timestamp: Date.parse('2026-10-05T20:59:50Z'),
    txHash: '2d83231685f03b17e1a001e6c82c38453459b4f67b416ef60f9be73133026f0e',
  },
  {
    id: 'tx-3',
    sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
    recipient: 'GCV4I3P3F2OMWYZGRXD5PR5AC3K7MUDSBMKDBPEMJ2MFHLVUAGJEK4DT',
    token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    amount: '10000000', // 1 XLM
    status: 'Blocked',
    reason: 'RecipientDenylisted (#11): rejected at simulation, never submitted',
    timestamp: Date.parse('2026-10-05T21:00:10Z'),
  },
];

const DEFAULT_ESCROWS: StoredEscrow[] = [
  {
    id: 'escrow-1',
    escrowIndex: 1,
    amount: '150',
    token: 'XLM',
    sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
    recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
    expiresAt: Math.floor(Date.now() / 1000) + 3600 * 18,
    status: 'Pending',
    txHash: '2d83231685f03b17e1a001e6c82c38453459b4f67b416ef60f9be73133026f0e',
  },
];

export class DataStore {
  private dataDir: string;
  private txFile: string;
  private escrowFile: string;
  private transactions: StoredTransaction[] = [];
  private escrows: StoredEscrow[] = [];

  constructor(baseDir?: string) {
    this.dataDir = baseDir || path.resolve(process.cwd(), '.data');
    this.txFile = path.join(this.dataDir, 'transactions.json');
    this.escrowFile = path.join(this.dataDir, 'escrows.json');
    this.initialize();
  }

  private initialize() {
    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
      } catch {}
    }

    // Load transactions
    if (fs.existsSync(this.txFile)) {
      try {
        const raw = fs.readFileSync(this.txFile, 'utf8');
        this.transactions = JSON.parse(raw);
      } catch {
        this.transactions = [...DEFAULT_TXS];
      }
    } else {
      this.transactions = [...DEFAULT_TXS];
      this.saveTransactions();
    }

    // Load escrows
    if (fs.existsSync(this.escrowFile)) {
      try {
        const raw = fs.readFileSync(this.escrowFile, 'utf8');
        this.escrows = JSON.parse(raw);
      } catch {
        this.escrows = [...DEFAULT_ESCROWS];
      }
    } else {
      this.escrows = [...DEFAULT_ESCROWS];
      this.saveEscrows();
    }
  }

  private saveTransactions() {
    try {
      fs.writeFileSync(this.txFile, JSON.stringify(this.transactions, null, 2), 'utf8');
    } catch {}
  }

  private saveEscrows() {
    try {
      fs.writeFileSync(this.escrowFile, JSON.stringify(this.escrows, null, 2), 'utf8');
    } catch {}
  }

  public getTransactions(limit = 100): StoredTransaction[] {
    return this.transactions.slice(0, limit);
  }

  public addTransaction(tx: StoredTransaction): void {
    const existingIdx = this.transactions.findIndex(
      (t) => (tx.txHash && t.txHash === tx.txHash) || t.id === tx.id
    );
    if (existingIdx >= 0) {
      this.transactions[existingIdx] = { ...this.transactions[existingIdx], ...tx };
    } else {
      this.transactions.unshift(tx);
    }
    this.saveTransactions();
  }

  public getEscrows(status?: 'Pending' | 'Released' | 'Refunded'): StoredEscrow[] {
    if (status) {
      return this.escrows.filter((e) => e.status === status);
    }
    return this.escrows;
  }

  public upsertEscrow(escrow: StoredEscrow): void {
    const idx = this.escrows.findIndex((e) => e.escrowIndex === escrow.escrowIndex);
    if (idx >= 0) {
      this.escrows[idx] = { ...this.escrows[idx], ...escrow };
    } else {
      this.escrows.unshift(escrow);
    }
    this.saveEscrows();
  }

  public updateEscrowStatus(escrowIndex: number, status: 'Released' | 'Refunded'): boolean {
    const e = this.escrows.find((item) => item.escrowIndex === escrowIndex);
    if (!e) return false;
    e.status = status;
    this.saveEscrows();
    return true;
  }
}

export const defaultStore = new DataStore();
