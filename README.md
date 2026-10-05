# Safeguard Backend & SDK

[![CI](https://github.com/Safeguard-Inc/safeguard-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/Safeguard-Inc/safeguard-backend/actions/workflows/ci.yml)
[![Validations](https://img.shields.io/badge/CI%2FCD-10%2F10%20Automated%20Checks-success.svg)](.github/workflows/ci.yml)
[![Pitch Video](https://img.shields.io/badge/Pitch%20Video-5%20Minutes%20(1080p)-4ade9b.svg)](https://safeguard-docs.vercel.app/assets/video/safeguard-pitch.mp4)
[![Canonical Errors](https://img.shields.io/badge/Errors-270%20Cataloged-blue.svg)](docs/ERROR_CODES.md)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/badge/npm-v0.1.0-blue.svg)](https://www.npmjs.com)
[![Live Demo](https://img.shields.io/badge/Demo-Live_Console-brightgreen.svg)](https://safeguard-dashboard-mocha.vercel.app)
[![Stellar](https://img.shields.io/badge/Stellar-Testnet-brightgreen.svg)](https://stellar.org)

[![Watch the Safeguard Pitch Video](https://safeguard-docs.vercel.app/assets/video/safeguard-pitch-poster.jpg)](https://safeguard-docs.vercel.app/assets/video/safeguard-pitch.mp4)

**Integration layer, event indexing daemon, and client SDK for Safeguard policy-guarded payments on Stellar.**


This repository powers:
1. **The Client SDK (`@safeguard-inc/sdk`):** Zero-broadcast pre-flight transaction simulation, Soroban error code decoding, and payment XDR builders.
2. **The Backend REST Service:** Live policy endpoints, spend cap queries, and indexed payment telemetry.

---

## Architecture

```text
┌───────────────────────┐         ┌─────────────────────────┐
│  Client App / dApp    │         │  Safeguard REST API     │
│  (Next.js / Frontend) │         │  (Express / Fastify)    │
└──────────┬────────────┘         └───────────┬─────────────┘
           │                                  │
           │  SafeguardClient SDK             │  Serves /api/policies
           │  simulatePayment()               │  Serves /api/transactions
           ▼                                  ▼
┌───────────────────────────────────────────────────────────┐
│               Soroban RPC (Stellar Testnet)               │
│                                                           │
│  • Reads SafeguardPayments contract state                │
│  • Simulates execution & measures Stroop gas fees        │
└───────────────────────────────────────────────────────────┘
```

---

## SDK Usage

### Installation
```bash
npm install @safeguard-inc/sdk @stellar/stellar-sdk
```

### Pre-flight Payment Simulation
```typescript
import { SafeguardClient } from '@safeguard-inc/backend';

const safeguard = new SafeguardClient();

const simulation = await safeguard.simulatePayment({
  sender: 'GBBM6WDF6SMPGMBCQXAWOJZZQB65SUWAAK4EDLOH7OQH226BC4STTU3V',
  recipient: 'GC2U3YSOCCLOHKADJ4INRHJDFVDMGZX3WWTPH7V62MQWETUD4LR4HDCA',
  token: 'CBLQLJAG72M4XQRJMQHSKYIFVHQD7LNTNOQH2GRMCMBWMSLBSLTGTJC7',
  amount: '500000000', // 50 units (in stroops)
});

console.log(simulation.decision); // "APPROVE" | "FLAG" | "BLOCK"
console.log(simulation.reason);
console.log(simulation.estimatedFeeStroops);
```

### Error Code Decoding
```typescript
const error = safeguard.decodeError(11);
console.log(error.name); // "RecipientDenylisted"
console.log(error.remediation);
```

---

## REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/health` | `GET` | Service status, uptime, and connected contract IDs |
| `/api/pay/simulate` | `POST` | Pre-flight transaction simulation against active policy |
| `/api/policies` | `GET` | Active policy version, rules, and spend cap thresholds |
| `/api/transactions` | `GET` | Telemetry of recent payments (Approved, Escrowed, Blocked) |
| `/api/errors/:code` | `GET` | Decodes a numeric Soroban revert code |

---

## Local Development & Testing

```bash
# Install dependencies
npm install

# Run test suite
npm run test:ts

# Build TypeScript to dist/
npm run build

# Start local server on :3001
npm run dev
```

---

## 🌊 Contributing & Stellar Drips Wave Sprints

We participate in the **Stellar Drips Wave** sprint program!

Browse our **[Issue Backlog](https://github.com/Safeguard-Inc/safeguard-backend/issues)** for contributor tasks:
* Issues are tagged with `Stellar Wave` and complexity ratings (`complexity: trivial`, `complexity: small`, `complexity: medium`).
* Focus areas: API validation schemas, webhook notifications, RPC retry policies, and CLI tooling.

See [CONTRIBUTING.md](CONTRIBUTING.md) for pull request instructions.

---

## License

Apache-2.0
