/**
 * auditLogExporter.ts
 *
 * Enterprise SIEM streaming log exporter supporting NDJSON (Newline Delimited JSON)
 * and RFC 5424 Syslog formatting for compliance ingestion into Splunk, Datadog, Elastic, and AWS CloudWatch.
 */

import crypto from 'crypto';
import { StoredTransaction } from '../server/store.js';

export type AuditEventCategory = 'compliance' | 'payment' | 'policy' | 'escrow' | 'security';
export type AuditEventStatus = 'SUCCESS' | 'DENIED' | 'FAILED' | 'PENDING';

export interface AuditEvent {
  '@timestamp': string;
  event_id: string;
  category: AuditEventCategory;
  action: string;
  actor: string;
  resource: string;
  status: AuditEventStatus;
  details: Record<string, unknown>;
  integrity_hash?: string;
}

export class AuditLogStreamExporter {
  /**
   * Computes a deterministic SHA-256 hash of an audit event to verify non-repudiation.
   */
  public static computeIntegrityHash(event: Omit<AuditEvent, 'integrity_hash'>): string {
    const payload = JSON.stringify({
      '@timestamp': event['@timestamp'],
      event_id: event.event_id,
      category: event.category,
      action: event.action,
      actor: event.actor,
      resource: event.resource,
      status: event.status,
      details: event.details,
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Attaches cryptographic integrity hash to each event in the collection.
   */
  public static signEvents(events: Omit<AuditEvent, 'integrity_hash'>[]): AuditEvent[] {
    return events.map((event) => ({
      ...event,
      integrity_hash: this.computeIntegrityHash(event),
    }));
  }

  /**
   * Formats events into Newline Delimited JSON (NDJSON) string.
   */
  public static toNdjson(events: AuditEvent[]): string {
    if (events.length === 0) return '';
    return events.map((e) => JSON.stringify(e)).join('\n') + '\n';
  }

  /**
   * Parses an NDJSON string back into AuditEvent records, safely skipping blank lines.
   */
  public static parseNdjson(ndjsonText: string): AuditEvent[] {
    if (!ndjsonText || typeof ndjsonText !== 'string') return [];
    return ndjsonText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as AuditEvent);
  }

  /**
   * Formats events into RFC 5424 Syslog format:
   * `<PRI>1 TIMESTAMP HOSTNAME APP-NAME PROCID MSGID [STRUCTURED-DATA] MSG`
   */
  public static toSyslogRfc5424(events: AuditEvent[], appName = 'safeguard', hostname = 'stellar-node'): string {
    return events
      .map((e) => {
        const pri = e.status === 'FAILED' ? 11 : e.status === 'DENIED' ? 12 : 14; // Facility 1 (user), Severity
        const timestamp = e['@timestamp'] || new Date().toISOString();
        const procId = process.pid || 1;
        const msgId = e.event_id;
        const sd = `[safeguard@43210 category="${e.category}" action="${e.action}" actor="${e.actor}" status="${e.status}"]`;
        const msg = JSON.stringify({ resource: e.resource, details: e.details, hash: e.integrity_hash });
        return `<${pri}>1 ${timestamp} ${hostname} ${appName} ${procId} ${msgId} ${sd} ${msg}`;
      })
      .join('\n');
  }

  /**
   * Converts StoredTransaction array into standard AuditEvents.
   */
  public static fromTransactions(txs: StoredTransaction[]): AuditEvent[] {
    const rawEvents: Omit<AuditEvent, 'integrity_hash'>[] = txs.map((tx) => {
      let status: AuditEventStatus = 'SUCCESS';
      if (tx.status === 'Blocked') status = 'DENIED';
      else if (tx.status === 'Escrowed') status = 'PENDING';

      return {
        '@timestamp': new Date(tx.timestamp || Date.now()).toISOString(),
        event_id: tx.id,
        category: 'payment',
        action: tx.status === 'Escrowed' ? 'escrow_lock' : 'transfer_settle',
        actor: tx.sender,
        resource: tx.recipient,
        status,
        details: {
          token: tx.token,
          amount: tx.amount,
          reason: tx.reason,
          txHash: tx.txHash,
          ledger: tx.ledger,
        },
      };
    });

    return this.signEvents(rawEvents);
  }
}
