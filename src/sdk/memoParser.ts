export type StellarMemoType = 'MEMO_NONE' | 'MEMO_TEXT' | 'MEMO_ID' | 'MEMO_HASH' | 'MEMO_RETURN';

export interface ParsedStellarMemo {
  type: StellarMemoType;
  value?: string;
  byteLength?: number;
  isValid: boolean;
  error?: string;
}

export function parseTransactionMemo(
  rawType: string = 'MEMO_NONE',
  rawValue?: string | number | null
): ParsedStellarMemo {
  const normType = String(rawType || '').trim().toUpperCase();

  if (!normType || normType === 'MEMO_NONE' || normType === 'NONE') {
    return {
      type: 'MEMO_NONE',
      isValid: true,
    };
  }

  const val = rawValue !== undefined && rawValue !== null ? String(rawValue).trim() : '';

  if (normType === 'MEMO_TEXT' || normType === 'TEXT') {
    const bytes = Buffer.byteLength(val, 'utf8');
    if (bytes > 28) {
      return {
        type: 'MEMO_TEXT',
        value: val,
        byteLength: bytes,
        isValid: false,
        error: `MEMO_TEXT exceeds 28 bytes limit (got ${bytes} bytes)`,
      };
    }
    return {
      type: 'MEMO_TEXT',
      value: val,
      byteLength: bytes,
      isValid: true,
    };
  }

  if (normType === 'MEMO_ID' || normType === 'ID') {
    if (!/^\d+$/.test(val)) {
      return {
        type: 'MEMO_ID',
        value: val,
        isValid: false,
        error: 'MEMO_ID must be a non-negative decimal string',
      };
    }
    try {
      const bn = BigInt(val);
      const MAX_U64 = 18446744073709551615n;
      if (bn < 0n || bn > MAX_U64) {
        return {
          type: 'MEMO_ID',
          value: val,
          isValid: false,
          error: 'MEMO_ID out of 64-bit unsigned integer range',
        };
      }
      return {
        type: 'MEMO_ID',
        value: val,
        byteLength: 8,
        isValid: true,
      };
    } catch {
      return {
        type: 'MEMO_ID',
        value: val,
        isValid: false,
        error: 'Invalid 64-bit integer',
      };
    }
  }

  if (normType === 'MEMO_HASH' || normType === 'HASH') {
    const isHex = /^[0-9a-fA-F]{64}$/.test(val);
    if (!isHex) {
      return {
        type: 'MEMO_HASH',
        value: val,
        isValid: false,
        error: 'MEMO_HASH must be a 64-character hex string (32 bytes)',
      };
    }
    return {
      type: 'MEMO_HASH',
      value: val.toLowerCase(),
      byteLength: 32,
      isValid: true,
    };
  }

  if (normType === 'MEMO_RETURN' || normType === 'RETURN') {
    const isHex = /^[0-9a-fA-F]{64}$/.test(val);
    if (!isHex) {
      return {
        type: 'MEMO_RETURN',
        value: val,
        isValid: false,
        error: 'MEMO_RETURN must be a 64-character hex string (32 bytes)',
      };
    }
    return {
      type: 'MEMO_RETURN',
      value: val.toLowerCase(),
      byteLength: 32,
      isValid: true,
    };
  }

  return {
    type: 'MEMO_NONE',
    value: val,
    isValid: false,
    error: `Unsupported memo type: ${rawType}`,
  };
}
