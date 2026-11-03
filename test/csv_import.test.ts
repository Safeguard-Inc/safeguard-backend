import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseTransactionCsv } from '../src/sdk/csvImport';

describe('Transaction CSV Import & Validation Tests', () => {
  it('parses valid CSV with headers and optional fields', () => {
    const csv = `sender,recipient,token,amount,status,memo,txHash
GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4,GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT,XLM,150.5,Approved,Payroll Sept,abcd1234efgh
GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4,GBVOL67TMUQBGL4TZDXHN3CQ7XA354OIO65LOHY2KV2G26H7G2M2PA2Z,CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC,50,Escrowed,"Bonus, Q3",efgh5678ijkl`;

    const result = parseTransactionCsv(csv);
    assert.equal(result.totalRowsProcessed, 2);
    assert.equal(result.valid.length, 2);
    assert.equal(result.errors.length, 0);

    const first = result.valid[0];
    assert.equal(first.sender, 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4');
    assert.equal(first.recipient, 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT');
    assert.equal(first.amount, '150.5');
    assert.equal(first.memo, 'Payroll Sept');

    const second = result.valid[1];
    assert.equal(second.memo, 'Bonus, Q3');
  });

  it('detects malformed public keys and invalid amounts with row indicators', () => {
    const csv = `sender,recipient,token,amount
INVALID_KEY,GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT,XLM,100
GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4,BAD_RECIPIENT,XLM,100
GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4,GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT,XLM,-25
GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4,GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT,,10`;

    const result = parseTransactionCsv(csv);
    assert.equal(result.valid.length, 0);
    assert.equal(result.errors.length, 4);

    assert.equal(result.errors[0].row, 2);
    assert.equal(result.errors[0].field, 'sender');

    assert.equal(result.errors[1].row, 3);
    assert.equal(result.errors[1].field, 'recipient');

    assert.equal(result.errors[2].row, 4);
    assert.equal(result.errors[2].field, 'amount');

    assert.equal(result.errors[3].row, 5);
    assert.equal(result.errors[3].field, 'token');
  });

  it('handles empty input gracefully', () => {
    const result = parseTransactionCsv('');
    assert.equal(result.totalRowsProcessed, 0);
    assert.equal(result.valid.length, 0);
    assert.equal(result.errors.length, 0);
  });
});
