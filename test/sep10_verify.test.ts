import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@stellar/stellar-sdk';
import {
  buildSep10Challenge,
  verifySep10Challenge,
  signSep10Challenge,
} from '../src/sdk/sep10.js';
import { createApp } from '../src/server/app.js';

describe('SEP-0010 Challenge Verification & Auth Flow Tests', () => {
  const serverKeypair = Keypair.random();
  const clientKeypair = Keypair.random();
  const attackerKeypair = Keypair.random();
  const homeDomain = 'safeguard.finance';

  test('successfully verifies client signature on genuine challenge', () => {
    const { transactionXdr } = buildSep10Challenge({
      serverKeypair,
      clientPublicKey: clientKeypair.publicKey(),
      homeDomain,
    });

    // Client signs the challenge
    const signedXdr = signSep10Challenge(transactionXdr, clientKeypair);

    // Server verifies
    const result = verifySep10Challenge(
      signedXdr,
      serverKeypair.publicKey(),
      homeDomain
    );

    assert.equal(result.valid, true);
    assert.equal(result.clientPublicKey, clientKeypair.publicKey());
  });

  test('rejects challenge signed by wrong keypair (impersonation attempt)', () => {
    const { transactionXdr } = buildSep10Challenge({
      serverKeypair,
      clientPublicKey: clientKeypair.publicKey(),
      homeDomain,
    });

    // Attacker signs with different keypair
    const signedXdr = signSep10Challenge(transactionXdr, attackerKeypair);

    const result = verifySep10Challenge(
      signedXdr,
      serverKeypair.publicKey(),
      homeDomain
    );

    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('Missing or invalid client signature'));
  });

  test('end-to-end HTTP authentication flow via /api/auth/challenge and /api/auth/verify', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    const operatorKeypair = Keypair.random();

    try {
      // 1. Request challenge
      const chalRes = await fetch(
        `http://localhost:${port}/api/auth/challenge?account=${operatorKeypair.publicKey()}`
      );
      assert.equal(chalRes.status, 200);
      const chalJson = (await chalRes.json()) as any;
      assert.equal(chalJson.success, true);
      assert.ok(chalJson.transactionXdr);

      // 2. Client signs challenge
      const signedByOperator = signSep10Challenge(
        chalJson.transactionXdr,
        operatorKeypair
      );

      // 3. Verify challenge
      const verifyRes = await fetch(`http://localhost:${port}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionXdr: signedByOperator }),
      });

      assert.equal(verifyRes.status, 200);
      const verifyJson = (await verifyRes.json()) as any;
      assert.equal(verifyJson.success, true);
      assert.equal(verifyJson.authenticatedAddress, operatorKeypair.publicKey());

      // 4. Reject unsigned or tampered challenge
      const failRes = await fetch(`http://localhost:${port}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionXdr: chalJson.transactionXdr }),
      });
      assert.equal(failRes.status, 401);
    } finally {
      server.close();
    }
  });
});
