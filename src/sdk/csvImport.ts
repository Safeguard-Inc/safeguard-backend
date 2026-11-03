/**
 * csvImport.ts
 *
 * CSV parser and validator for historical Stellar transactions and enterprise payment runs.
 * Supports standard RFC 4180 CSV with quotes, headers, and row-level validation.
 */

export interface ParsedCsvTransaction {
  row: number;
  sender: string;
  recipient: string;
  token: string;
  amount: string;
  status?: string;
  memo?: string;
  txHash?: string;
}

export interface CsvImportError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface CsvImportResult {
  valid: ParsedCsvTransaction[];
  errors: CsvImportError[];
  totalRowsProcessed: number;
}

function parseCsvLines(csvText: string): string[][] {
  const lines: string[][] = [];
  const rows = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);

  for (const row of rows) {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    lines.push(fields);
  }

  return lines;
}

function isValidStellarAddress(addr: string): boolean {
  return /^[G|C][A-Z0-9]{55}$/.test(addr);
}

export function parseTransactionCsv(csvText: string): CsvImportResult {
  const rows = parseCsvLines(csvText);
  if (rows.length === 0) {
    return { valid: [], errors: [], totalRowsProcessed: 0 };
  }

  // Detect header row
  const header = rows[0].map((h) => h.toLowerCase());
  const senderIdx = header.indexOf('sender');
  const recipientIdx = header.indexOf('recipient');
  const tokenIdx = header.indexOf('token');
  const amountIdx = header.indexOf('amount');
  const statusIdx = header.indexOf('status');
  const memoIdx = header.indexOf('memo');
  const txHashIdx = header.indexOf('txhash') !== -1 ? header.indexOf('txhash') : header.indexOf('tx_hash');

  const hasRequiredHeaders = senderIdx !== -1 && recipientIdx !== -1 && tokenIdx !== -1 && amountIdx !== -1;
  const startRow = hasRequiredHeaders ? 1 : 0;

  const valid: ParsedCsvTransaction[] = [];
  const errors: CsvImportError[] = [];

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;

    const sIdx = hasRequiredHeaders ? senderIdx : 0;
    const rIdx = hasRequiredHeaders ? recipientIdx : 1;
    const tIdx = hasRequiredHeaders ? tokenIdx : 2;
    const aIdx = hasRequiredHeaders ? amountIdx : 3;

    const sender = row[sIdx] || '';
    const recipient = row[rIdx] || '';
    const token = row[tIdx] || '';
    const amount = row[aIdx] || '';
    const status = statusIdx !== -1 ? row[statusIdx] : undefined;
    const memo = memoIdx !== -1 ? row[memoIdx] : undefined;
    const txHash = txHashIdx !== -1 ? row[txHashIdx] : undefined;

    let hasRowError = false;

    if (!isValidStellarAddress(sender)) {
      errors.push({
        row: rowNumber,
        field: 'sender',
        value: sender,
        message: 'Invalid Stellar public key format (must start with G or C and be 56 characters)',
      });
      hasRowError = true;
    }

    if (!isValidStellarAddress(recipient)) {
      errors.push({
        row: rowNumber,
        field: 'recipient',
        value: recipient,
        message: 'Invalid Stellar recipient public key format',
      });
      hasRowError = true;
    }

    if (!token || token.trim().length === 0) {
      errors.push({
        row: rowNumber,
        field: 'token',
        value: token,
        message: 'Token identifier cannot be empty',
      });
      hasRowError = true;
    }

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errors.push({
        row: rowNumber,
        field: 'amount',
        value: amount,
        message: 'Amount must be a positive number',
      });
      hasRowError = true;
    }

    if (!hasRowError) {
      valid.push({
        row: rowNumber,
        sender,
        recipient,
        token,
        amount,
        status,
        memo,
        txHash,
      });
    }
  }

  return {
    valid,
    errors,
    totalRowsProcessed: rows.length - startRow,
  };
}
