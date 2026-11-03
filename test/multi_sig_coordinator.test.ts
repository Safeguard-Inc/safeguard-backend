import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MultiSigCoordinator } from '../src/sdk/multiSigCoordinator.ts';

describe('Stellar MultiSig Coordinator & Threshold Aggregator Tests', () => {
  const corporateAccount = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  const signer1 = 'GA6LW724VD6PVAG6U3Z3I342OKAQ6CVT5AC4YIN6STMV5Y5REB335AD3';
  const signer2 = 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4';
  const signer3 = 'GDYAZQ7E6B23XJTXN2W2K6N3H3Y564L4O5IELJ4LGF6333YXZMND2P4M';

  test('registers multi-sig account with weighted signers and thresholds', () => {
    const coordinator = new MultiSigCoordinator();
    coordinator.registerAccount({
      address: corporateAccount,
      signers: [
        { publicKey: signer1, weight: 1 },
        { publicKey: signer2, weight: 2 },
        { publicKey: signer3, weight: 1 },
      ],
      thresholds: {
        low: 1,
        medium: 2,
        high: 3,
      },
    });

    const account = coordinator.getAccount(corporateAccount);
    assert.ok(account);
    assert.equal(account.signers.length, 3);
    assert.equal(account.thresholds.medium, 2);
  });

  test('proposes transaction and accumulates threshold weight until ready', () => {
    const coordinator = new MultiSigCoordinator();
    coordinator.registerAccount({
      address: corporateAccount,
      signers: [
        { publicKey: signer1, weight: 1 },
        { publicKey: signer2, weight: 2 },
        { publicKey: signer3, weight: 1 },
      ],
      thresholds: { low: 1, medium: 2, high: 3 },
    });

    const tx = coordinator.proposeTransaction(corporateAccount, 'mock-xdr-payload', 'medium');
    assert.equal(tx.requiredWeight, 2);
    assert.equal(tx.currentWeight, 0);
    assert.equal(tx.isReady, false);

    // Signer 1 signs (weight 1 -> total 1 < 2 -> not ready)
    const step1 = coordinator.addSignature(tx.id, signer1, 'sig-1-base64');
    assert.equal(step1.currentWeight, 1);
    assert.equal(step1.isReady, false);

    // Signer 3 signs (weight 1 -> total 2 >= 2 -> ready!)
    const step2 = coordinator.addSignature(tx.id, signer3, 'sig-3-base64');
    assert.equal(step2.currentWeight, 2);
    assert.equal(step2.isReady, true);

    const finalTx = coordinator.getTransaction(tx.id);
    assert.ok(finalTx);
    assert.equal(finalTx.isReady, true);
    assert.equal(Object.keys(finalTx.collectedSignatures).length, 2);
  });

  test('rejects signatures from unauthorized signers', () => {
    const coordinator = new MultiSigCoordinator();
    coordinator.registerAccount({
      address: corporateAccount,
      signers: [{ publicKey: signer1, weight: 2 }],
      thresholds: { low: 1, medium: 2, high: 2 },
    });

    const tx = coordinator.proposeTransaction(corporateAccount, 'mock-xdr-payload', 'medium');
    assert.throws(
      () => coordinator.addSignature(tx.id, 'GUNAUTHORIZEDKEY111111111111111111111111111111111111111', 'sig'),
      /not an authorized signer/
    );
  });
});
