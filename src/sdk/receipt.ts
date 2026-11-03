/**
 * receipt.ts
 *
 * Transaction receipt formatting and serialization utilities.
 * Supports standard RFC 4180 CSV generation and JSON serialization
 * for audit trail compliance, indexer synchronization, and accounting reconciliations.
 */

import { TransactionReceipt } from './types.js';

export interface CsvExportOptions {
  includeHeaders?: boolean;
  delimiter?: string;
}

/**
 * Escapes and quotes a CSV field per RFC 4180.
 */
export function formatCsvField(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializes an array of transaction receipts into RFC 4180 compliant CSV format.
 */
export function serializeReceiptCsv(receipts: TransactionReceipt[], options: CsvExportOptions = {}): string {
  const includeHeaders = options.includeHeaders ?? true;
  const delimiter = options.delimiter ?? ',';
  const headers = ['id', 'timestamp', 'sender', 'recipient', 'token', 'amount', 'status', 'reason', 'txHash', 'ledger'];

  const rows: string[] = [];
  if (includeHeaders) {
    rows.push(headers.join(delimiter));
  }

  for (const r of receipts) {
    const row = [
      formatCsvField(r.id),
      formatCsvField(new Date(r.timestamp).toISOString()),
      formatCsvField(r.sender),
      formatCsvField(r.recipient),
      formatCsvField(r.token),
      formatCsvField(r.amount),
      formatCsvField(r.status),
      formatCsvField(r.reason ?? ''),
      formatCsvField(r.txHash ?? ''),
      formatCsvField(r.ledger ?? ''),
    ];
    rows.push(row.join(delimiter));
  }

  return rows.join('\r\n');
}

/**
 * Serializes transaction receipt(s) to a formatted JSON string.
 */
export function serializeReceiptJson(receipts: TransactionReceipt | TransactionReceipt[], pretty = true): string {
  return JSON.stringify(receipts, null, pretty ? 2 : 0);
}
