import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FailoverRpcProvider } from '../src/sdk/rpcProvider';

describe('FailoverRpcProvider Resilient Routing Tests', () => {
  it('initializes with primary and fallback endpoints and routes to primary first', () => {
    const provider = new FailoverRpcProvider({
      primaryUrl: 'https://soroban-testnet.stellar.org',
      fallbackUrls: [
        'https://rpc-testnet.stellar.org',
        'https://soroban-node-backup.stellar.org',
      ],
      maxConsecutiveFailures: 2,
    });

    assert.equal(provider.getActiveEndpoint(), 'https://soroban-testnet.stellar.org');
    const nodes = provider.getAllNodes();
    assert.equal(nodes.length, 3);
    assert.equal(nodes[0].isHealthy, true);
  });

  it('records successes and updates latency metrics', () => {
    const provider = new FailoverRpcProvider({
      primaryUrl: 'https://soroban-testnet.stellar.org',
      fallbackUrls: ['https://rpc-testnet.stellar.org'],
    });

    provider.recordSuccess(42);
    const nodes = provider.getAllNodes();
    assert.equal(nodes[0].latencyMs, 42);
    assert.equal(nodes[0].consecutiveFailures, 0);
  });

  it('triggers automatic failover after consecutive failures exceed threshold', () => {
    const provider = new FailoverRpcProvider({
      primaryUrl: 'https://primary.stellar.org',
      fallbackUrls: ['https://backup1.stellar.org', 'https://backup2.stellar.org'],
      maxConsecutiveFailures: 2,
    });

    assert.equal(provider.getActiveEndpoint(), 'https://primary.stellar.org');

    // First failure (does not trip threshold yet)
    provider.recordFailure();
    assert.equal(provider.getActiveEndpoint(), 'https://primary.stellar.org');

    // Second failure trips threshold, switches to backup1
    provider.recordFailure();
    assert.equal(provider.getActiveEndpoint(), 'https://backup1.stellar.org');

    const nodes = provider.getAllNodes();
    assert.equal(nodes[0].isHealthy, false);
    assert.equal(nodes[1].isHealthy, true);
  });

  it('executes operation and automatically fails over on error to healthy node', async () => {
    const provider = new FailoverRpcProvider({
      primaryUrl: 'https://flaky-primary.stellar.org',
      fallbackUrls: ['https://reliable-fallback.stellar.org'],
      maxConsecutiveFailures: 1,
    });

    let primaryAttempts = 0;
    let fallbackAttempts = 0;

    const result = await provider.executeWithFailover(async (url) => {
      if (url === 'https://flaky-primary.stellar.org') {
        primaryAttempts++;
        throw new Error('503 Service Unavailable');
      }
      fallbackAttempts++;
      return { status: 'ok', ledger: 10420 };
    });

    assert.equal(primaryAttempts, 1);
    assert.equal(fallbackAttempts, 1);
    assert.deepEqual(result, { status: 'ok', ledger: 10420 });
    assert.equal(provider.getActiveEndpoint(), 'https://reliable-fallback.stellar.org');
  });

  it('throws when all available RPC endpoints fail', async () => {
    const provider = new FailoverRpcProvider({
      primaryUrl: 'https://down-1.stellar.org',
      fallbackUrls: ['https://down-2.stellar.org'],
      maxConsecutiveFailures: 1,
    });

    await assert.rejects(
      async () => {
        await provider.executeWithFailover(async () => {
          throw new Error('Network timeout');
        });
      },
      { message: 'Network timeout' }
    );
  });

  it('resets node health back to primary cleanly', () => {
    const provider = new FailoverRpcProvider({
      primaryUrl: 'https://primary.stellar.org',
      fallbackUrls: ['https://backup.stellar.org'],
      maxConsecutiveFailures: 1,
    });

    provider.recordFailure();
    assert.equal(provider.getActiveEndpoint(), 'https://backup.stellar.org');

    provider.resetHealth();
    assert.equal(provider.getActiveEndpoint(), 'https://primary.stellar.org');
    assert.equal(provider.getAllNodes()[0].isHealthy, true);
  });
});
