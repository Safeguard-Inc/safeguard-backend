# Changelog

All notable changes to the `safeguard-backend` repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-03

### Added
- **TypeScript SDK (`SafeguardClient`)**: Complete client library with zero-gas simulation, SEP-10 authentication helpers, and transaction builder utilities.
- **270 Canonical Error Codes Taxonomy**: Programmatic lookup, mnemonics resolution, and localized human-readable error descriptions.
- **Soroban Indexing Daemon**: Live cursor-persisted ledger event indexing monitoring escrow deposits, releases, refunds, and policy changes.
- **Regulatory Reporting Suite**:
  - `InstitutionalBalanceSheetReportGenerator` and `/api/export/balance-sheet` (Markdown / JSON).
  - `RegulatoryCompliancePacketExporter` and `/api/export/compliance-packet` with SHA-256 tamper-evident seal.
  - `AuditLogStreamExporter` supporting NDJSON, Syslog RFC 5424, and JSON arrays.
- **Enterprise Batch Disbursement Engine**: Multi-recipient payout engine with automatic chunk partitioning and Soroban gas fee estimation.
- **Cross-Currency Liquidity & AMM Estimators**: Soroban liquidity pool routing estimator and multi-currency aggregate disbursement planner.
- **Operational Resiliency & Observability**:
  - Live Prometheus `/metrics` telemetry.
  - Webhook delivery dispatcher with exponential backoff and dead-letter queue (DLQ) inspection endpoints.
  - Real-time WebSocket compliance event broadcaster (`ComplianceWebSocketBroadcaster`).
  - Tiered token-bucket rate limiting middleware.
  - Interactive OpenAPI / Swagger UI documentation at `/docs`.

### Changed
- Refactored server route registration and factory architecture.
- Synchronized error catalog with `safeguard-core` 270 error definitions.
