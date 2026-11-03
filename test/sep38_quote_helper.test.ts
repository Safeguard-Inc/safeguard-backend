import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Sep38QuoteHelper } from '../src/sdk/sep38QuoteHelper';

describe('SEP-0038 Quote Helper Unit Tests', () => {
  it('parses native and issued asset strings cleanly', () => {
    assert.deepEqual(Sep38QuoteHelper.parseAsset('stellar:native'), { type: 'native', code: 'XLM' });
    assert.deepEqual(Sep38QuoteHelper.parseAsset('XLM'), { type: 'native', code: 'XLM' });

    const issued = Sep38QuoteHelper.parseAsset(
      'stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
    );
    assert.equal(issued.type, 'issued');
    assert.equal(issued.code, 'USDC');
    assert.equal(issued.issuer, 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN');
  });

  it('formats asset string into standard SEP-38 format', () => {
    assert.equal(Sep38QuoteHelper.formatAssetString('XLM'), 'stellar:native');
    assert.equal(
      Sep38QuoteHelper.formatAssetString('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'),
      'stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
    );
  });

  it('calculates cross-asset conversion amounts with precision', () => {
    // 100 XLM at 0.12 USDC/XLM = 12.0 USDC
    assert.equal(Sep38QuoteHelper.calculateConvertAmount('100', '0.12'), '12');

    // 50 USDC at 8.3333333 XLM/USDC = 416.666665 XLM
    const res = Sep38QuoteHelper.calculateConvertAmount('50', '8.3333333');
    assert.equal(res, '416.666665');

    // Bad inputs
    assert.equal(Sep38QuoteHelper.calculateConvertAmount('-5', '1.0'), '0.00');
    assert.equal(Sep38QuoteHelper.calculateConvertAmount('abc', '1.0'), '0.00');
    assert.equal(Sep38QuoteHelper.calculateConvertAmount('10', '0'), '0.00');
  });

  it('evaluates active vs expired quote timestamps', () => {
    const futureDate = new Date(Date.now() + 60000).toISOString();
    const pastDate = new Date(Date.now() - 60000).toISOString();

    assert.equal(Sep38QuoteHelper.isQuoteActive(futureDate), true);
    assert.equal(Sep38QuoteHelper.isQuoteActive(pastDate), false);
    assert.equal(Sep38QuoteHelper.isQuoteActive('invalid-date'), false);
  });

  it('parses raw quote response objects safely', () => {
    const raw = {
      id: 'quote-1234',
      sell_asset: 'stellar:native',
      buy_asset: 'stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      price: '0.125',
      total_price: '0.125',
      sell_amount: '1000',
      buy_amount: '125',
      expires_at: '2026-12-31T23:59:59Z',
    };

    const quote = Sep38QuoteHelper.parseQuoteResponse(raw);
    assert.ok(quote);
    assert.equal(quote?.id, 'quote-1234');
    assert.equal(quote?.sellAsset, 'stellar:native');
    assert.equal(quote?.buyAmount, '125');

    // Corrupted payload
    assert.equal(Sep38QuoteHelper.parseQuoteResponse(null), null);
    assert.equal(Sep38QuoteHelper.parseQuoteResponse({}), null);
  });
});
