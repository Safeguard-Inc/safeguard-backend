import { ERROR_CATALOG as CANONICAL_ERROR_CATALOG, getError } from '../errors/catalog.js';

export interface DecodedError {
  code: number;
  name: string;
  message: string;
  remediation: string;
}

export const SOROBAN_CONTRACT_ERROR_MAP: Record<number, { name: string; message: string; remediation: string }> = {
  1: {
    name: 'NotInitialized',
    message: 'The Safeguard contract has not been initialized with an admin key.',
    remediation: 'Deploy and initialize the contract using initialize(admin, escrow_period, spend_cap).',
  },
  2: {
    name: 'AlreadyInitialized',
    message: 'The contract has already been initialized.',
    remediation: 'No action required; contract is active.',
  },
  3: {
    name: 'Unauthorized',
    message: 'Caller lacks administrative authority for this action.',
    remediation: 'Ensure the transaction is signed by the registered admin key.',
  },
  4: {
    name: 'ContractPaused',
    message: 'Safeguard payments are currently paused by the administrator.',
    remediation: 'Contact the operator to unpause the payment gateway via set_paused(false).',
  },
  5: {
    name: 'InvalidAmount',
    message: 'Payment amount must be strictly greater than zero.',
    remediation: 'Provide a positive amount parameter.',
  },
  6: {
    name: 'SpendCapExceeded',
    message: 'Amount exceeds the instantaneous spend cap; payment is held in escrow.',
    remediation: 'Request admin approval or split payment below the spend cap threshold.',
  },
  7: {
    name: 'PolicyDenied',
    message: 'Transaction violates the active compliance policy rules.',
    remediation: 'Review active rules at GET /api/policies for restrictions.',
  },
  8: {
    name: 'EscrowNotFound',
    message: 'The requested escrow ID does not exist.',
    remediation: 'Verify the escrow ID against GET /api/transactions.',
  },
  9: {
    name: 'EscrowAlreadySettled',
    message: 'This escrow payment has already been released or refunded.',
    remediation: 'No further settlement possible for this escrow record.',
  },
  10: {
    name: 'EscrowTimelockActive',
    message: 'The escrow grace period has not expired yet.',
    remediation: 'Wait until the release_after timestamp has passed or request admin refund.',
  },
  11: {
    name: 'RecipientDenylisted',
    message: 'Payment blocked: the recipient address is registered on the active denylist.',
    remediation: 'The recipient address is prohibited from receiving funds under compliance policy.',
  },
  12: {
    name: 'SenderDenylisted',
    message: 'Payment blocked: the sender address is restricted on the active denylist.',
    remediation: 'The sender address has been frozen or denylisted by the compliance administrator.',
  },
};

export function decodeErrorCode(code: number): DecodedError {
  const contractEntry = SOROBAN_CONTRACT_ERROR_MAP[code];
  if (contractEntry) {
    return { code, ...contractEntry };
  }

  const canonical = CANONICAL_ERROR_CATALOG[code];
  if (canonical) {
    return {
      code,
      name: canonical.mnemonic,
      message: canonical.description,
      remediation: canonical.recoveryHint,
    };
  }

  return {
    code,
    name: 'UnknownError',
    message: `Contract reverted with unclassified code #${code}.`,
    remediation: 'Inspect contract event logs on Soroban RPC.',
  };
}

