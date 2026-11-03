import * as fs from 'fs';
import * as path from 'path';

export interface IndexerCursorState {
  contractId: string;
  lastLedger: number;
  lastCursor?: string;
  updatedAt: number;
}

export interface CursorStoreOptions {
  storageFile?: string;
  flushIntervalMs?: number;
}

export class CursorStore {
  private states: Map<string, IndexerCursorState> = new Map();
  private storageFile?: string;

  constructor(options: CursorStoreOptions = {}) {
    this.storageFile = options.storageFile;
    if (this.storageFile) {
      this.loadFromFile();
    }
  }

  public get(contractId: string): IndexerCursorState | null {
    const s = this.states.get(contractId.toUpperCase());
    return s ? { ...s } : null;
  }

  public set(state: IndexerCursorState): void {
    const normalized: IndexerCursorState = {
      contractId: state.contractId.toUpperCase(),
      lastLedger: Math.max(0, state.lastLedger),
      lastCursor: state.lastCursor,
      updatedAt: state.updatedAt || Date.now(),
    };
    this.states.set(normalized.contractId, normalized);
    this.saveToFile();
  }

  public advance(contractId: string, ledger: number, cursor?: string): IndexerCursorState {
    const existing = this.get(contractId);
    const updated: IndexerCursorState = {
      contractId: contractId.toUpperCase(),
      lastLedger: existing ? Math.max(existing.lastLedger, ledger) : ledger,
      lastCursor: cursor || existing?.lastCursor,
      updatedAt: Date.now(),
    };
    this.states.set(updated.contractId, updated);
    this.saveToFile();
    return updated;
  }

  public clear(): void {
    this.states.clear();
    this.saveToFile();
  }

  private loadFromFile(): void {
    if (!this.storageFile || !fs.existsSync(this.storageFile)) return;
    try {
      const raw = fs.readFileSync(this.storageFile, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && item.contractId) {
            this.states.set(String(item.contractId).toUpperCase(), item);
          }
        }
      }
    } catch {
      // Fallback safely to empty store if corrupt
      this.states.clear();
    }
  }

  private saveToFile(): void {
    if (!this.storageFile) return;
    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.states.values());
      fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2), 'utf8');
    } catch {
      // Graceful fallback if file system is read-only
    }
  }
}

export const defaultCursorStore = new CursorStore();
