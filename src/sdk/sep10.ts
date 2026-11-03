/**
 * sep10.ts
 *
 * SEP-0010 Stellar Web Authentication challenge transaction generator and validator.
 * Enables cryptographically authenticated session issuance between dashboard clients
 * and Safeguard backend services without sharing private keys.
 */

import {
  Keypair,
  TransactionBuilder,
  Account,
  Networks,
  Operation,
  Transaction,
} from '@stellar/stellar-sdk';
import crypto from 'crypto';

export interface ChallengeOptions {
  serverKeypair: Keypair;
  clientPublicKey: string;
  homeDomain: string;
  networkPassphrase?: string;
  timeoutSeconds?: number;
}

export interface ChallengeVerificationResult {
  valid: boolean;
  clientPublicKey?: string;
  error?: string;
}

/**
 * Builds and signs a SEP-0010 challenge transaction.
 */
export function buildSep10Challenge(options: ChallengeOptions): {
  transactionXdr: string;
  networkPassphrase: string;
} {
  const {
    serverKeypair,
    clientPublicKey,
    homeDomain,
    networkPassphrase = Networks.TESTNET,
    timeoutSeconds = 300,
  } = options;

  const now = Math.floor(Date.now() / 1000);
  const timebounds = {
    minTime: (now - 10).toString(),
    maxTime: (now + timeoutSeconds).toString(),
  };

  // SEP-0010 requires sequence number "0"
  const serverAccount = new Account(serverKeypair.publicKey(), '0');

  // Cryptographically random 48-byte nonce
  const nonce = crypto.randomBytes(48);

  const tx = new TransactionBuilder(serverAccount, {
    fee: '100',
    networkPassphrase,
    timebounds,
  })
    .addOperation(
      Operation.manageData({
        source: clientPublicKey,
        name: `${homeDomain} auth`,
        value: nonce,
      })
    )
    .build();

  // Server signs first
  tx.sign(serverKeypair);

  return {
    transactionXdr: tx.toXDR(),
    networkPassphrase,
  };
}

/**
 * Validates a client-signed SEP-0010 challenge transaction.
 */
export function verifySep10Challenge(
  transactionXdr: string,
  serverPublicKey: string,
  homeDomain: string,
  networkPassphrase = Networks.TESTNET
): ChallengeVerificationResult {
  try {
    const tx = new Transaction(transactionXdr, networkPassphrase);

    // 1. Verify sequence number is 0
    if (tx.sequence !== '0') {
      return { valid: false, error: 'Sequence number must be 0' };
    }

    // 2. Verify server source account
    if (tx.source !== serverPublicKey) {
      return { valid: false, error: 'Transaction source does not match server key' };
    }

    // 3. Verify operations: must contain manageData with `${homeDomain} auth`
    if (tx.operations.length < 1) {
      return { valid: false, error: 'Transaction contains no operations' };
    }

    const firstOp = tx.operations[0];
    if (firstOp.type !== 'manageData') {
      return { valid: false, error: 'First operation must be manageData' };
    }

    if (firstOp.name !== `${homeDomain} auth`) {
      return { valid: false, error: `Invalid operation name: expected "${homeDomain} auth"` };
    }

    const clientPublicKey = firstOp.source;
    if (!clientPublicKey) {
      return { valid: false, error: 'Operation source (client address) missing' };
    }

    // 4. Verify timebounds validity
    const now = Math.floor(Date.now() / 1000);
    if (tx.timeBounds) {
      const min = parseInt(tx.timeBounds.minTime, 10);
      const max = parseInt(tx.timeBounds.maxTime, 10);
      if (now < min || now > max) {
        return { valid: false, error: 'Challenge transaction has expired' };
      }
    }

    // 5. Verify server signature
    const serverKey = Keypair.fromPublicKey(serverPublicKey);
    const hasServerSig = tx.signatures.some((sig) => {
      try {
        return serverKey.verify(tx.hash(), sig.signature());
      } catch {
        return false;
      }
    });

    if (!hasServerSig) {
      return { valid: false, error: 'Missing or invalid server signature' };
    }

    // 6. Verify client signature
    const clientKey = Keypair.fromPublicKey(clientPublicKey);
    const hasClientSig = tx.signatures.some((sig) => {
      try {
        return clientKey.verify(tx.hash(), sig.signature());
      } catch {
        return false;
      }
    });

    if (!hasClientSig) {
      return { valid: false, error: 'Missing or invalid client signature' };
    }

    return {
      valid: true,
      clientPublicKey,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Failed to decode challenge: ${err.message}`,
    };
  }
}
