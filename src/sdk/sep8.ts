/**
 * sep8.ts
 *
 * SEP-0008 Regulated Assets compliance interface and response parser.
 * Handles issuer authorization flows, compliance server callbacks, and approval status parsing.
 */

export type Sep8Status = 'success' | 'revised' | 'pending' | 'rejected';

export interface Sep8ApprovalResponse {
  status: Sep8Status;
  tx?: string;
  message?: string;
  timeout?: number;
  error?: string;
}

export function parseSep8Response(rawResponse: unknown): Sep8ApprovalResponse {
  if (!rawResponse || typeof rawResponse !== 'object') {
    return {
      status: 'rejected',
      error: 'Invalid SEP-0008 response format (must be a JSON object)',
    };
  }

  const res = rawResponse as Record<string, unknown>;
  const statusStr = String(res.status || '').toLowerCase();

  if (statusStr === 'success') {
    return {
      status: 'success',
      tx: typeof res.tx === 'string' ? res.tx : undefined,
      message: typeof res.message === 'string' ? res.message : undefined,
    };
  }

  if (statusStr === 'revised') {
    return {
      status: 'revised',
      tx: typeof res.tx === 'string' ? res.tx : undefined,
      message: typeof res.message === 'string' ? res.message : undefined,
    };
  }

  if (statusStr === 'pending') {
    return {
      status: 'pending',
      timeout: typeof res.timeout === 'number' ? res.timeout : 60,
      message: typeof res.message === 'string' ? res.message : 'Approval pending off-chain review',
    };
  }

  return {
    status: 'rejected',
    error: typeof res.error === 'string' ? res.error : 'Transaction rejected by compliance server',
  };
}

export function isSep8Approved(response: Sep8ApprovalResponse): boolean {
  return response.status === 'success' || response.status === 'revised';
}
