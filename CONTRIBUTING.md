# Contributing to Safeguard Backend & SDK

Thank you for your interest in contributing to Safeguard Backend & SDK! We welcome contributions, feature enhancements, and bug reports.

## Code of Conduct

All contributors and maintainers are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Development Workflow

### Prerequisites
* Node.js 20+ (Node 22 and 25 supported)
* npm 10+

### Setup
```bash
git clone https://github.com/Safeguard-Inc/safeguard-backend.git
cd safeguard-backend
npm install
npm run test:ts
npm run build
```

### Pull Request & Commit Guidelines
* We adhere to Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`.
* Ensure TypeScript compilation (`npx tsc --noEmit`) and unit tests (`npm run test:ts`) pass with zero errors.
* Reference relevant issues in your PR description.

## Security Vulnerabilities
Please refer to [SECURITY.md](SECURITY.md) and report security findings to `security@safeguard.inc`.
