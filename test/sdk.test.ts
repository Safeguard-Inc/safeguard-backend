import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SafeguardClient } from '../src/sdk/client.js';
import { decodeErrorCode } from '../src/sdk/errors.js';

describe('SafeguardClient SDK Tests', () => {
  const client = new SafeguardClient();

  test('approves payment within spend cap for clean parties', async () => {
    const result = await client.simulatePayment({
      sender: 'GBBM6WDF6SMPGMBCQXAWOJZZQB65SUWAAK4EDLOH7OQH226BC4STTU3V',
      recipient: 'GC2U3YSOCCLOHKADJ4INRHJDFVDMGZX3WWTPH7V62MQWETUD4LR4HDCA',
      token: 'CDC6KVX7QT7CD3GOVGX44NQUNS7FMSZKIAXTV3TDGSXQKJRQMDZRSRCN',
      amount: '500000000', // 50 units (under 1000 default)
    });

    assert.equal(result.decision, 'APPROVE');
    assert.equal(result.isEscrow, false);
    assert.equal(result.reasonCode, 0);
  });

  test('flags payment exceeding spend cap to escrow', async () => {
    const result = await client.simulatePayment({
      sender: 'GBBM6WDF6SMPGMBCQXAWOJZZQB65SUWAAK4EDLOH7OQH226BC4STTU3V',
      recipient: 'GC2U3YSOCCLOHKADJ4INRHJDFVDMGZX3WWTPH7V62MQWETUD4LR4HDCA',
      token: 'CDC6KVX7QT7CD3GOVGX44NQUNS7FMSZKIAXTV3TDGSXQKJRQMDZRSRCN',
      amount: '50000000000', // 5,000 units (over 1000 cap)
    });

    assert.equal(result.decision, 'FLAG');
    assert.equal(result.isEscrow, true);
    assert.equal(result.reasonCode, 6);
  });

  test('blocks payment to denylisted recipient', async () => {
    client.setDenylist(['GBLOCKEDRECIPIENT12345']);

    const result = await client.simulatePayment({
      sender: 'GBBM6WDF6SMPGMBCQXAWOJZZQB65SUWAAK4EDLOH7OQH226BC4STTU3V',
      recipient: 'GBLOCKEDRECIPIENT12345',
      token: 'CDC6KVX7QT7CD3GOVGX44NQUNS7FMSZKIAXTV3TDGSXQKJRQMDZRSRCN',
      amount: '10000000',
    });

    assert.equal(result.decision, 'BLOCK');
    assert.equal(result.reasonCode, 11); // RecipientDenylisted
  });

  test('decodes error codes accurately', () => {
    const err4 = decodeErrorCode(4);
    assert.equal(err4.name, 'ContractPaused');

    const err11 = decodeErrorCode(11);
    assert.equal(err11.name, 'RecipientDenylisted');

    const errUnknown = decodeErrorCode(999);
    assert.equal(errUnknown.name, 'UnknownError');
  });

  test('canonical 270 error code catalog integrity and lookup', () => {
    const { ERROR_CATALOG, TOTAL_ERROR_CODES, getError } = require('../src/errors/catalog.ts');
    assert.equal(TOTAL_ERROR_CODES, 270);
    assert.equal(Object.keys(ERROR_CATALOG).length, 270);

    // Test specific domain lookups
    const hostErr = getError(1000);
    assert.equal(hostErr.mnemonic, 'HOST_BUDGET_EXCEEDED');
    assert.equal(hostErr.httpStatus, 500);

    const policyErr = getError(2001);
    assert.equal(policyErr.mnemonic, 'POLICY_NOT_FOUND');
    assert.equal(policyErr.httpStatus, 404);

    const paymentErr = getError(3004);
    assert.equal(paymentErr.mnemonic, 'SPEND_CAP_EXCEEDED');

    const escrowErr = getError(4003);
    assert.equal(escrowErr.mnemonic, 'ESCROW_TIMELOCK_ACTIVE');

    const sanctionsErr = getError(5001);
    assert.equal(sanctionsErr.mnemonic, 'SPECIALLY_DESIGNATED_NATIONAL');

    const authErr = getError(6003);
    assert.equal(authErr.mnemonic, 'EMERGENCY_PAUSE_ACTIVE');

    const sdkErr = getError(7000);
    assert.equal(sdkErr.mnemonic, 'NETWORK_TIMEOUT');

    const auditErr = getError(8000);
    assert.equal(auditErr.mnemonic, 'AUDIT_LOG_TAMPERED');

    const configErr = getError(9002);
    assert.equal(configErr.mnemonic, 'CONTRACT_NOT_INITIALIZED');
  });
});

