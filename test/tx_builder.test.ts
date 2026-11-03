import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import { StellarTransactionBuilderHelper } from '../src/sdk/txBuilder';

describe('StellarTransactionBuilderHelper Tests', () => {
  const helper = new StellarTransactionBuilderHelper(Networks.TESTNET, 100);

  it('builds a valid Stellar payment transaction envelope in XDR', () => {
    const sender = Keypair.random();
    const recipient = Keypair.random();

    const xdr = helper.createPaymentTransaction(
      {
        sourceAccount: sender.publicKey(),
        sequenceNumber: '1000',
        baseFeeStroops: 200,
        timeoutSeconds: 300,
      },
      {
        destination: recipient.publicKey(),
        amount: '25.5000000',
      }
    );

    assert.ok(typeof xdr === 'string');
    assert.ok(xdr.length > 50);

    const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
    assert.equal(tx.source, sender.publicKey());
    assert.equal(tx.fee.toString(), '200');
    assert.equal(tx.operations.length, 1);
    assert.equal(tx.operations[0].type, 'payment');
  });

  it('correctly attaches MEMO_TEXT and MEMO_ID to envelope', () => {
    const sender = Keypair.random();
    const recipient = Keypair.random();

    // MEMO_TEXT
    const xdrText = helper.createPaymentTransaction(
      {
        sourceAccount: sender.publicKey(),
        sequenceNumber: '1001',
        memo: { type: 'text', value: 'Payroll #123' },
      },
      {
        destination: recipient.publicKey(),
        amount: '10',
      }
    );

    const txText = TransactionBuilder.fromXDR(xdrText, Networks.TESTNET);
    assert.equal(txText.memo.type, 'text');
    assert.equal(txText.memo.value?.toString(), 'Payroll #123');

    // MEMO_ID
    const xdrId = helper.createPaymentTransaction(
      {
        sourceAccount: sender.publicKey(),
        sequenceNumber: '1002',
        memo: { type: 'id', value: '987654321' },
      },
      {
        destination: recipient.publicKey(),
        amount: '10',
      }
    );

    const txId = TransactionBuilder.fromXDR(xdrId, Networks.TESTNET);
    assert.equal(txId.memo.type, 'id');
    assert.equal(txId.memo.value?.toString(), '987654321');
  });

  it('cryptographically signs transaction and appends signature', () => {
    const sender = Keypair.random();
    const recipient = Keypair.random();

    const unsignedXdr = helper.createPaymentTransaction(
      {
        sourceAccount: sender.publicKey(),
        sequenceNumber: '1003',
      },
      {
        destination: recipient.publicKey(),
        amount: '50',
      }
    );

    const txUnsigned = TransactionBuilder.fromXDR(unsignedXdr, Networks.TESTNET);
    assert.equal(txUnsigned.signatures.length, 0);

    const signedXdr = helper.signTransaction(unsignedXdr, sender);
    const txSigned = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
    assert.equal(txSigned.signatures.length, 1);
  });
});
