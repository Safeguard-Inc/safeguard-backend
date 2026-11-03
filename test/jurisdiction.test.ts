import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getJurisdictionByNumeric,
  getJurisdictionByAlpha2,
  formatJurisdictionString,
} from '../src/sdk/jurisdiction';

describe('ISO 3166-1 Jurisdiction Registry Tests', () => {
  it('resolves jurisdiction by standard numeric code', () => {
    const us = getJurisdictionByNumeric(840);
    assert.ok(us);
    assert.equal(us.alpha2, 'US');
    assert.equal(us.name, 'United States');
    assert.equal(us.flag, '🇺🇸');

    const uk = getJurisdictionByNumeric(826);
    assert.ok(uk);
    assert.equal(uk.alpha2, 'GB');
    assert.equal(uk.name, 'United Kingdom');

    const unknown = getJurisdictionByNumeric(99999);
    assert.equal(unknown, undefined);
  });

  it('resolves jurisdiction by alpha-2 code case-insensitively', () => {
    const de = getJurisdictionByAlpha2('de');
    assert.ok(de);
    assert.equal(de.numericCode, 276);
    assert.equal(de.name, 'Germany');

    const jp = getJurisdictionByAlpha2('JP');
    assert.ok(jp);
    assert.equal(jp.numericCode, 392);
  });

  it('correctly marks sanctioned / high-risk jurisdictions', () => {
    const kp = getJurisdictionByNumeric(408);
    assert.ok(kp);
    assert.equal(kp.isHighRisk, true);

    const us = getJurisdictionByNumeric(840);
    assert.equal(us?.isHighRisk, undefined);
  });

  it('formats human-readable jurisdiction string with flag and country code', () => {
    const formatted = formatJurisdictionString(840);
    assert.equal(formatted, '🇺🇸 United States (US)');

    const fallback = formatJurisdictionString(999);
    assert.equal(fallback, 'Jurisdiction #999');
  });
});
