# Security Policy

Safeguard Backend & SDK powers mission-critical pre-flight simulation, indexing daemons, and compliance gateways for Stellar institutional transactions.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

Send all security reports to **`security@safeguard.inc`**.

Please include:
* Module and version affected
* Proof of concept or reproduction script
* Impact on consensus telemetry or payment authorization
* Threat model and potential attack vectors

## Security Controls Implemented

* **Cryptographic Verification**: Webhook HMAC-SHA256 signatures and SHA-256 integrity digests for all audit streams.
* **Fail-Closed Evaluation**: Pre-flight simulator fails closed on all unrecognized errors or network timeouts.
* **Tiered Rate Limiting**: Token-bucket algorithm mitigating denial-of-service vectors.
* **Security Headers**: Helmet-secured HTTP endpoints preventing common web vulnerabilities.
