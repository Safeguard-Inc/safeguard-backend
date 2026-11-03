import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';
import { buildSep10Challenge } from '../src/sdk/sep10.js';

describe('SEP-0010 Stellar Web Authentication Challenge Builder Tests', () => {
  const serverKeypair = Keypair.random();
  const clientKeypair = Keypair.random();
  const homeDomain = 'safeguard.finance';

  it('generates a valid SEP-0010 challenge transaction with sequence number 0', () => {
    const { transactionXdr, networkPassphrase } = buildSep10Challenge({
      serverKeypair,
      clientPublicKey: clientKeypair.publicKey(),
      homeDomain,
    });

    assert.ok(transactionXdr);
    assert.equal(networkPassphrase, Networks.TESTNET);

    const tx = new Transaction(transactionXdr, networkPassphrase);

    assert.equal(tx.sequence, '0');
    assert.equal(tx.source, serverKeypair.publicKey());
    assert.equal(tx.operations.length, 1);

    const op = tx.operations[0] as any;
    assert.equal(op.type, 'manageData');
    assert.equal(op.name, 'safeguard.finance auth');
    assert.equal(op.source, clientKeypair.publicKey());
    assert.equal(op.value.length, 48); // 48-byte cryptographically secure nonce
  });

  it('includes a valid server cryptographic signature', () => {
    const { transactionXdr, networkPassphrase } = buildSep10Challenge({
      serverKeypair,
      clientPublicKey: clientKeypair.publicKey(),
      homeDomain,
    });

    const tx = new Transaction(transactionXdr, networkPassphrase);
    assert.equal(tx.signatures.length, 1);

    const verified = serverKeypair.verify(tx.hash(), tx.signatures[0].signature());
    assert.equal(verified, true);
  });

  it('sets accurate timebounds matching timeout parameter', () => {
    const now = Math.floor(Date.now() / 1000);
    const { transactionXdr } = buildSep10Challenge({
      serverKeypair,
      clientPublicKey: clientKeypair.publicKey(),
      homeDomain,
      timeoutSeconds: 600,
    });

    const tx = new Transaction(transactionXdr, Networks.TESTNET);
    assert.ok(tx.timeBounds);

    const min = parseInt(tx.timeBounds.minTime, 10);
    const max = parseInt(tx.timeBounds.maxTime, 10);

    assert.ok(min <= now);
    assert.ok(max >= now + 590 && max <= now + 610);
  });
});
