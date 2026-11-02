import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SafeguardClient } from '../src/sdk/client.js';

describe('SafeguardClient Payment Memo Tests', () => {
  const client = new SafeguardClient();

  test('validates MEMO_TEXT within 28 bytes limit', () => {
    assert.equal(client.validateMemo({ type: 'text', value: 'Invoice #1042' }).valid, true);
    assert.equal(client.validateMemo({ type: 'text', value: '1234567890123456789012345678' }).valid, true);

    const overLimit = client.validateMemo({ type: 'text', value: 'This text memo definitely exceeds 28 bytes limit!' });
    assert.equal(overLimit.valid, false);
    assert.ok(overLimit.error?.includes('exceeds 28 bytes'));
  });

  test('validates MEMO_ID within 64-bit unsigned integer range', () => {
    assert.equal(client.validateMemo({ type: 'id', value: '123456789' }).valid, true);
    assert.equal(client.validateMemo({ type: 'id', value: '18446744073709551615' }).valid, true); // max u64

    const nonNumeric = client.validateMemo({ type: 'id', value: 'abc-invalid' });
    assert.equal(nonNumeric.valid, false);

    const overflow = client.validateMemo({ type: 'id', value: '18446744073709551616' });
    assert.equal(overflow.valid, false);
    assert.ok(overflow.error?.includes('exceeds u64 bounds'));
  });

  test('validates MEMO_HASH and MEMO_RETURN 32-byte hex encoding', () => {
    const validHex = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    assert.equal(client.validateMemo({ type: 'hash', value: validHex }).valid, true);
    assert.equal(client.validateMemo({ type: 'return', value: validHex }).valid, true);

    const tooShort = client.validateMemo({ type: 'hash', value: 'deadbeef' });
    assert.equal(tooShort.valid, false);

    const nonHex = client.validateMemo({ type: 'hash', value: 'z'.repeat(64) });
    assert.equal(nonHex.valid, false);
  });

  test('simulatePayment blocks transactions with invalid memo and passes valid ones', async () => {
    const blockedSim = await client.simulatePayment({
      sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
      recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
      token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
      amount: '10000000',
      memo: {
        type: 'text',
        value: 'This payment memo is far too long for Stellar network specifications',
      },
    });

    assert.equal(blockedSim.decision, 'BLOCK');
    assert.equal(blockedSim.reasonCode, 2);
    assert.ok(blockedSim.reason.includes('Invalid Stellar payment memo'));

    const approvedSim = await client.simulatePayment({
      sender: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
      recipient: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
      token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
      amount: '10000000',
      memo: {
        type: 'text',
        value: 'Approved memo',
      },
    });

    assert.equal(approvedSim.decision, 'APPROVE');
  });
});
