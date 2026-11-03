/**
 * batchCsvGenerator.ts
 *
 * Enterprise payment run CSV template generator.
 * Produces structured, validated CSV data for payroll disbursements, vendor payouts, and dividend distributions.
 */

export type BatchTemplateType = 'payroll' | 'vendor_payout' | 'dividend_distribution';

export interface BatchTemplateOptions {
  type?: BatchTemplateType;
  rowCount?: number;
  tokenSymbol?: string;
  senderAddress?: string;
  includeMemos?: boolean;
}

const DEFAULT_SENDER = 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4';

const SAMPLE_RECIPIENTS = [
  'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
  'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7',
  'GCF3LOM2EDL2I6G3QZ2K4S2X55O7R6F437G3H2I27L6P6N54L3B3V5O2',
  'GDX3O4Z5J6K7L8M9N0P1Q2R3S4T5U6V7W8X9Y0Z1A2B3C4D5E6F7G8H9',
];

export function generateBatchCsvTemplate(options: BatchTemplateOptions = {}): string {
  const type = options.type ?? 'payroll';
  const rowCount = Math.min(Math.max(1, options.rowCount ?? 3), SAMPLE_RECIPIENTS.length);
  const token = options.tokenSymbol ?? 'XLM';
  const sender = options.senderAddress ?? DEFAULT_SENDER;
  const includeMemos = options.includeMemos ?? true;

  const headers = ['sender', 'recipient', 'token', 'amount'];
  if (includeMemos) {
    headers.push('memo');
  }

  const lines: string[] = [headers.join(',')];

  for (let i = 0; i < rowCount; i++) {
    const recipient = SAMPLE_RECIPIENTS[i];
    let amount = '100.0000000';
    let memo = '';

    if (type === 'payroll') {
      amount = (2500 + i * 250).toFixed(7);
      memo = `"Payroll #EMP-00${i + 1}"`;
    } else if (type === 'vendor_payout') {
      amount = (850 + i * 125.5).toFixed(7);
      memo = `"INV-2026-0${i + 1}"`;
    } else if (type === 'dividend_distribution') {
      amount = (45.75 + i * 15.25).toFixed(7);
      memo = `"DIV-Q3-2026"`;
    }

    const row = [sender, recipient, token, amount];
    if (includeMemos) {
      row.push(memo);
    }
    lines.push(row.join(','));
  }

  return lines.join('\n');
}
