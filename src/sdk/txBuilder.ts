/**
 * txBuilder.ts
 *
 * Client-side Stellar transaction envelope builder with dynamic fee attachment,
 * memo formatting, and timebound configuration.
 */

import {
  Account,
  Asset,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { StellarMemo } from './types.js';

export interface TxBuildOptions {
  sourceAccount: string;
  sequenceNumber: string;
  networkPassphrase?: string;
  baseFeeStroops?: number;
  memo?: StellarMemo;
  timeoutSeconds?: number;
}

export interface PaymentOpOptions {
  destination: string;
  amount: string;
  asset?: Asset;
}

export class StellarTransactionBuilderHelper {
  private networkPassphrase: string;
  private baseFee: number;

  constructor(networkPassphrase = Networks.TESTNET, baseFee = 100) {
    this.networkPassphrase = networkPassphrase;
    this.baseFee = baseFee;
  }

  public createPaymentTransaction(
    options: TxBuildOptions,
    payment: PaymentOpOptions
  ): string {
    const account = new Account(options.sourceAccount, options.sequenceNumber);
    const fee = options.baseFeeStroops ?? this.baseFee;
    const timeout = options.timeoutSeconds ?? 180;

    const builder = new TransactionBuilder(account, {
      fee: fee.toString(),
      networkPassphrase: options.networkPassphrase ?? this.networkPassphrase,
    });

    builder.setTimeout(timeout);

    if (options.memo && options.memo.type !== 'none') {
      const type = options.memo.type.toUpperCase();
      if (type === 'TEXT' || type === 'MEMO_TEXT') {
        builder.addMemo(Memo.text(options.memo.value));
      } else if (type === 'ID' || type === 'MEMO_ID') {
        builder.addMemo(Memo.id(options.memo.value));
      } else if (type === 'HASH' || type === 'MEMO_HASH') {
        builder.addMemo(Memo.hash(options.memo.value));
      } else if (type === 'RETURN' || type === 'MEMO_RETURN') {
        builder.addMemo(Memo.return(options.memo.value));
      }
    }

    builder.addOperation(
      Operation.payment({
        destination: payment.destination,
        asset: payment.asset ?? Asset.native(),
        amount: payment.amount,
      })
    );

    const tx = builder.build();
    return tx.toXDR();
  }

  public signTransaction(xdr: string, signerKeypair: Keypair): string {
    const tx = TransactionBuilder.fromXDR(xdr, this.networkPassphrase);
    tx.sign(signerKeypair);
    return tx.toXDR();
  }
}
