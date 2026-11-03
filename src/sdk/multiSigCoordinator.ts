export interface SignerWeight {
  publicKey: string;
  weight: number;
}

export interface MultiSigThresholds {
  low: number;
  medium: number;
  high: number;
}

export interface MultiSigAccountConfig {
  address: string;
  signers: SignerWeight[];
  thresholds: MultiSigThresholds;
}

export interface PendingMultiSigTransaction {
  id: string;
  accountAddress: string;
  txXdr: string;
  operationLevel: 'low' | 'medium' | 'high';
  collectedSignatures: Record<string, string>; // publicKey -> base64 signature
  currentWeight: number;
  requiredWeight: number;
  isReady: boolean;
  createdAt: number;
}

export class MultiSigCoordinator {
  private accounts: Map<string, MultiSigAccountConfig> = new Map();
  private pendingTxs: Map<string, PendingMultiSigTransaction> = new Map();

  public registerAccount(config: MultiSigAccountConfig): void {
    const norm = {
      ...config,
      address: config.address.trim().toUpperCase(),
      signers: config.signers.map((s) => ({
        publicKey: s.publicKey.trim().toUpperCase(),
        weight: Math.max(0, s.weight),
      })),
    };
    this.accounts.set(norm.address, norm);
  }

  public getAccount(address: string): MultiSigAccountConfig | undefined {
    return this.accounts.get(address.trim().toUpperCase());
  }

  public proposeTransaction(
    accountAddress: string,
    txXdr: string,
    operationLevel: 'low' | 'medium' | 'high' = 'medium'
  ): PendingMultiSigTransaction {
    const normAddr = accountAddress.trim().toUpperCase();
    const config = this.getAccount(normAddr);
    const requiredWeight = config ? config.thresholds[operationLevel] : 1;
    const id = `msig-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const pending: PendingMultiSigTransaction = {
      id,
      accountAddress: normAddr,
      txXdr,
      operationLevel,
      collectedSignatures: {},
      currentWeight: 0,
      requiredWeight,
      isReady: false,
      createdAt: Date.now(),
    };

    this.pendingTxs.set(id, pending);
    return { ...pending };
  }

  public addSignature(
    txId: string,
    signerPublicKey: string,
    signatureBase64: string
  ): { isReady: boolean; currentWeight: number; requiredWeight: number } {
    const tx = this.pendingTxs.get(txId);
    if (!tx) {
      throw new Error(`Pending transaction ${txId} not found`);
    }

    const normSigner = signerPublicKey.trim().toUpperCase();
    const config = this.getAccount(tx.accountAddress);

    // Calculate weight for signer
    let signerWeight = 1;
    if (config) {
      const found = config.signers.find((s) => s.publicKey === normSigner);
      if (!found) {
        throw new Error(`Signer ${signerPublicKey} is not an authorized signer for ${tx.accountAddress}`);
      }
      signerWeight = found.weight;
    }

    // Record signature
    if (!tx.collectedSignatures[normSigner]) {
      tx.collectedSignatures[normSigner] = signatureBase64;
      tx.currentWeight += signerWeight;
    }

    tx.isReady = tx.currentWeight >= tx.requiredWeight;
    return {
      isReady: tx.isReady,
      currentWeight: tx.currentWeight,
      requiredWeight: tx.requiredWeight,
    };
  }

  public getTransaction(txId: string): PendingMultiSigTransaction | undefined {
    const tx = this.pendingTxs.get(txId);
    return tx ? { ...tx } : undefined;
  }

  public listPending(accountAddress?: string): PendingMultiSigTransaction[] {
    const all = Array.from(this.pendingTxs.values());
    if (accountAddress) {
      const norm = accountAddress.trim().toUpperCase();
      return all.filter((t) => t.accountAddress === norm);
    }
    return all;
  }

  public removeTransaction(txId: string): boolean {
    return this.pendingTxs.delete(txId);
  }
}

export const defaultMultiSigCoordinator = new MultiSigCoordinator();
