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

**Integration layer, pre-flight simulation engine, and TypeScript client SDK for Safeguard policy-guarded payments on Stellar.**

This repository powers:
1. **The Client SDK (`@safeguard-inc/backend`):** Zero-broadcast pre-flight transaction simulation, Soroban revert decoding across 270 canonical error codes, and payment XDR builders.
2. **The Backend REST Service:** Express-based microservice exposing health checks, policy queries, spend cap validation, and real-time telemetry indexing.

---

## The Four-Tier Stack

| Repository | Role | Technology |
| :--- | :--- | :--- |
| [**`safeguard-contracts`**](https://github.com/Safeguard-Inc/safeguard-contracts) | Smart Contracts & Policy Engine | Rust, Soroban SDK, `no_std` |
| **`safeguard-backend`** (this repo) | Pre-flight Simulation SDK & REST API | TypeScript, Node.js, Express |
| [**`safeguard-dashboard`**](https://github.com/Safeguard-Inc/safeguard-dashboard) | Institutional Web3 Console | Next.js 14, Freighter, Tailwind |
| [**`safeguard-docs`**](https://github.com/Safeguard-Inc/safeguard-docs) | Documentation Hub & Simulator | Static Web, Vercel |

---

## Architecture Overview

```text
┌───────────────────────┐         ┌─────────────────────────┐
│  Client App / dApp    │         │  Safeguard REST API     │
│  (Next.js / Frontend) │         │  (Express / Node.js)    │
└──────────┬────────────┘         └───────────┬─────────────┘
           │                                  │
           │  SafeguardClient SDK             │  Serves /api/policies
           │  simulatePayment()               │  Serves /api/transactions
           ▼                                  ▼
┌───────────────────────────────────────────────────────────┐
│               Soroban RPC (Stellar Testnet)               │
│                                                           │
│  • Reads SafeguardPayments contract state                │
│  • Reads SafeguardPolicy deterministic evaluation rules   │
│  • Pre-flights transaction execution & Stroop gas fees    │
└───────────────────────────────────────────────────────────┘
```

---

## Live Stellar Testnet Contracts

The SDK is configured by default for Stellar Testnet:

| Contract | Address / Contract ID | Role |
| :--- | :--- | :--- |
| **Safeguard Payments Gateway** | `CBH4XG6K5XJHY3QMVUP7LGB4BFFG4C3XQ5Z64K7Z5OC66UDF4RAGRXYZ` | Payments & Escrow Vault |
| **Safeguard Policy Engine** | `CAQI3YI244YV7QGZ5VODUUGKFX6C4XNDQ2Y64K7Z5OC66UDF4RAGRP4V` | Deterministic Rules Engine |
| **Native SAC Token (SEP-41)** | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | Testnet XLM / SAC Token |
| **Multi-Sig Admin** | `GDIYQ7X5E22P3H75YQ7LOUXFX6C4XNDQ2Y64K7Z5OC66UDF4RAGRP4V` | Governance Authority |

---

## SDK Quickstart

### Installation

```bash
npm install @safeguard-inc/backend @stellar/stellar-sdk
```

### 1. Pre-flight Payment Simulation

Simulate transaction compliance without spending gas or broadcasting to the network:

```typescript
import { SafeguardClient } from '@safeguard-inc/backend';

const safeguard = new SafeguardClient({
  rpcUrl: 'https://soroban-testnet.stellar.org',
  paymentsContractId: 'CBH4XG6K5XJHY3QMVUP7LGB4BFFG4C3XQ5Z64K7Z5OC66UDF4RAGRXYZ',
  policyContractId: 'CAQI3YI244YV7QGZ5VODUUGKFX6C4XNDQ2Y64K7Z5OC66UDF4RAGRP4V',
});

// Simulate a payment before submission
const simulation = await safeguard.simulatePayment({
  sender: 'GBBM6WDF6SMPGMBCQXAWOJZZQB65SUWAAK4EDLOH7OQH226BC4STTU3V',
  recipient: 'GC2U3YSOCCLOHKADJ4INRHJDFVDMGZX3WWTPH7V62MQWETUD4LR4HDCA',
  token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  amount: '500000000', // 50 XLM (in stroops)
});

console.log(simulation.decision); // "APPROVE" | "FLAG" | "BLOCK"
console.log(simulation.reason);
console.log('Estimated Fee (stroops):', simulation.estimatedFeeStroops);
```

### 2. Error Code Decoding (270 Structured Codes)

Instantly decode on-chain Soroban revert codes into actionable human-readable explanations and remediation guides:

```typescript
// Decode policy error 2001
const error = safeguard.decodeError(2001);
console.log(error.mnemonic);     // "POLICY_NOT_FOUND"
console.log(error.description);  // "Requested policy schema is not registered."
console.log(error.remediation);  // "Verify policy ID against on-chain registry."

// Decode payment error 1002
const deniedErr = safeguard.decodeError(1002);
console.log(deniedErr.mnemonic); // "PAYMENT_DENIED"
```

---

## REST API Reference

The included Express application provides HTTP endpoints for dApps and services:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| **`/health`** | `GET` | Service status, uptime, connected network, and contract registry |
| **`/api/pay/simulate`** | `POST` | Pre-flight transaction simulation against active on-chain policy |
| **`/api/policies`** | `GET` | Active policy schema version, rules, and spend cap thresholds |
| **`/api/transactions`** | `GET` | Indexed payment telemetry (Approved, Escrowed, Blocked) |
| **`/api/errors/:code`** | `GET` | Decodes a numeric Soroban revert code from the 270 error catalog |
| **`/api/metrics`** | `GET` | Prometheus / operational telemetry metrics |

### Example: Pre-Flight Simulation API Request

```bash
curl -X POST http://localhost:4000/api/pay/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "GBBM6WDF6SMPGMBCQXAWOJZZQB65SUWAAK4EDLOH7OQH226BC4STTU3V",
    "recipient": "GC2U3YSOCCLOHKADJ4INRHJDFVDMGZX3WWTPH7V62MQWETUD4LR4HDCA",
    "token": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    "amount": "500000000"
  }'
```

---

## Environment Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | HTTP listening port for REST API |
| `SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` | Soroban RPC endpoint |
| `NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` | Stellar network passphrase |
| `PAYMENTS_CONTRACT_ID` | `CBH4XG6K5XJHY3QMVUP7LGB4BFFG4C3XQ5Z64K7Z5OC66UDF4RAGRXYZ` | Payments Gateway contract address |
| `POLICY_CONTRACT_ID` | `CAQI3YI244YV7QGZ5VODUUGKFX6C4XNDQ2Y64K7Z5OC66UDF4RAGRP4V` | Policy Engine contract address |

---

## Local Development & Testing

```bash
# Install dependencies
npm ci

# Run test suite (unit tests, simulation, 270 error catalog integrity)
npm test

# Type-check TypeScript
npx tsc --noEmit

# Compile to dist/
npm run build

# Start the REST API server locally
npm start
```

---

## 🌊 Contributing & Stellar Drips Wave Sprints

We participate in the **Stellar Drips Wave** sprint program!

Browse our **[Issue Backlog](https://github.com/Safeguard-Inc/safeguard-backend/issues)**:
* Issues are tagged with `Stellar Wave` and complexity ratings (`complexity: small`, `complexity: medium`).
* Focus areas: WebSocket event streams, SQLite local caching, and Horizon transaction submitter integration.

See [CONTRIBUTING.md](CONTRIBUTING.md) for pull request guidelines.

---

## License

Licensed under the Apache License, Version 2.0 ([LICENSE](LICENSE)).
