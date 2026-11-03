import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseTransactionMemo } from '../src/sdk/memoParser.ts';

describe('Stellar Transaction Memo Parser & Validator Tests', () => {
  test('parses MEMO_NONE correctly', () => {
    const res = parseTransactionMemo('MEMO_NONE');
    assert.equal(res.type, 'MEMO_NONE');
    assert.equal(res.isValid, true);
  });

  test('validates MEMO_TEXT within 28 bytes UTF-8 boundary', () => {
    const valid = parseTransactionMemo('MEMO_TEXT', 'Invoice #1024');
    assert.equal(valid.isValid, true);
    assert.equal(valid.type, 'MEMO_TEXT');
    assert.equal(valid.value, 'Invoice #1024');
    assert.equal(valid.byteLength, 13);

    const tooLong = parseTransactionMemo('MEMO_TEXT', 'This text is definitely much longer than twenty-eight bytes');
    assert.equal(tooLong.isValid, false);
    assert.match(tooLong.error || '', /exceeds 28 bytes/);
  });

  test('validates MEMO_ID within 64-bit integer range', () => {
    const valid = parseTransactionMemo('MEMO_ID', '12345678901234');
    assert.equal(valid.isValid, true);
    assert.equal(valid.type, 'MEMO_ID');
    assert.equal(valid.value, '12345678901234');

    const maxU64 = parseTransactionMemo('MEMO_ID', '18446744073709551615');
    assert.equal(maxU64.isValid, true);

    const overflow = parseTransactionMemo('MEMO_ID', '18446744073709551616');
    assert.equal(overflow.isValid, false);
    assert.match(overflow.error || '', /out of 64-bit unsigned integer range/);

    const nonNumeric = parseTransactionMemo('MEMO_ID', 'not-a-number');
    assert.equal(nonNumeric.isValid, false);
  });

  test('validates MEMO_HASH and MEMO_RETURN 32-byte hex strings', () => {
    const hash32 = '3389e9f0f73b444b7e2313a606d43f7250a6c51c127a195b88309b3294fa6bce';
    const validHash = parseTransactionMemo('MEMO_HASH', hash32);
    assert.equal(validHash.isValid, true);
    assert.equal(validHash.type, 'MEMO_HASH');
    assert.equal(validHash.byteLength, 32);

    const validReturn = parseTransactionMemo('MEMO_RETURN', hash32);
    assert.equal(validReturn.isValid, true);
    assert.equal(validReturn.type, 'MEMO_RETURN');

    const invalidHex = parseTransactionMemo('MEMO_HASH', 'not-hex-64-characters');
    assert.equal(invalidHex.isValid, false);
    assert.match(invalidHex.error || '', /64-character hex string/);
  });
});
