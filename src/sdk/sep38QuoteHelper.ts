/**
 * sep38QuoteHelper.ts
 *
 * Stellar SEP-0038 Anchor RFQ (Request for Quote) standard helper for pricing
 * cross-asset payments and multi-currency escrow settlements.
 */

export interface Sep38PriceQuote {
  id: string;
  sellAsset: string;
  buyAsset: string;
  price: string;
  totalPrice: string;
  sellAmount: string;
  buyAmount: string;
  expiresAt: string;
}

export interface Sep38IndicativePrice {
  sellAsset: string;
  buyAsset: string;
  price: string;
}

export class Sep38QuoteHelper {
  /**
   * Parses a SEP-38 asset string into code and issuer.
   * Format: `stellar:native` or `stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`
   */
  public static parseAsset(assetStr: string): { type: 'native' | 'issued'; code: string; issuer?: string } {
    if (!assetStr || typeof assetStr !== 'string') {
      return { type: 'native', code: 'XLM' };
    }
    const clean = assetStr.trim();
    if (clean === 'stellar:native' || clean.toLowerCase() === 'xlm' || clean.toLowerCase() === 'native') {
      return { type: 'native', code: 'XLM' };
    }

    const parts = clean.split(':');
    if (parts.length === 3 && parts[0] === 'stellar') {
      return { type: 'issued', code: parts[1], issuer: parts[2] };
    }
    if (parts.length === 2) {
      return { type: 'issued', code: parts[0], issuer: parts[1] };
    }

    return { type: 'issued', code: clean };
  }

  /**
   * Formats an asset representation into standard SEP-38 format.
   */
  public static formatAssetString(code: string, issuer?: string): string {
    const cleanCode = (code || 'XLM').toUpperCase();
    if (cleanCode === 'XLM' || cleanCode === 'NATIVE' || !issuer) {
      return cleanCode === 'XLM' || cleanCode === 'NATIVE' ? 'stellar:native' : `stellar:${cleanCode}`;
    }
    return `stellar:${cleanCode}:${issuer}`;
  }

  /**
   * Calculates converted buy amount from sell amount and rate.
   * `buyAmount = sellAmount * price`
   */
  public static calculateConvertAmount(sellAmount: string, price: string): string {
    const sellNum = parseFloat(sellAmount);
    const priceNum = parseFloat(price);

    if (isNaN(sellNum) || isNaN(priceNum) || sellNum < 0 || priceNum <= 0) {
      return '0.00';
    }

    const res = sellNum * priceNum;
    return res.toFixed(7).replace(/\.?0+$/, '');
  }

  /**
   * Evaluates if a SEP-38 quote is active or expired.
   */
  public static isQuoteActive(expiresAt: string, nowMs: number = Date.now()): boolean {
    try {
      const expMs = new Date(expiresAt).getTime();
      return !isNaN(expMs) && expMs > nowMs;
    } catch {
      return false;
    }
  }

  /**
   * Safely parses raw SEP-38 JSON quote response.
   */
  public static parseQuoteResponse(raw: any): Sep38PriceQuote | null {
    if (!raw || typeof raw !== 'object') return null;
    if (!raw.id || !raw.sell_asset || !raw.buy_asset || !raw.price) return null;

    return {
      id: String(raw.id),
      sellAsset: String(raw.sell_asset),
      buyAsset: String(raw.buy_asset),
      price: String(raw.price),
      totalPrice: String(raw.total_price || raw.price),
      sellAmount: String(raw.sell_amount || '0'),
      buyAmount: String(raw.buy_amount || '0'),
      expiresAt: String(raw.expires_at || ''),
    };
  }
}
