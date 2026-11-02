import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SafeguardClient } from '../src/sdk/client.js';
import { KNOWN_SAC_TOKENS } from '../src/sdk/types.js';

describe('Safeguard Backend SAC Token Registry Tests', () => {
  const client = new SafeguardClient();

  it('retrieves all supported SAC tokens', () => {
    const tokens = client.getSupportedTokens();
    assert.strictEqual(tokens.length, 4);

    const symbols = tokens.map((t) => t.symbol);
    assert.ok(symbols.includes('XLM'));
    assert.ok(symbols.includes('USDC'));
    assert.ok(symbols.includes('EURC'));
    assert.ok(symbols.includes('PYUSD'));
  });

  it('resolves token by symbol case-insensitively', () => {
    const usdc = client.resolveToken('usdc');
    assert.ok(usdc);
    assert.strictEqual(usdc?.contractId, KNOWN_SAC_TOKENS.USDC.contractId);
    assert.strictEqual(usdc?.decimals, 7);

    const pyusd = client.resolveToken('PyUsD');
    assert.ok(pyusd);
    assert.strictEqual(pyusd?.symbol, 'PYUSD');
  });

  it('resolves token by SAC contract ID', () => {
    const xlm = client.resolveToken(KNOWN_SAC_TOKENS.XLM.contractId);
    assert.ok(xlm);
    assert.strictEqual(xlm?.symbol, 'XLM');
  });

  it('returns undefined for unknown symbols or contracts', () => {
    assert.strictEqual(client.resolveToken('INVALID_TOKEN'), undefined);
  });
});
