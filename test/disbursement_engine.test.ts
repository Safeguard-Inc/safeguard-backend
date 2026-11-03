import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EnterpriseBatchDisbursementEngine,
  type DisbursementOrder,
} from '../src/sdk/disbursementEngine.js';

describe('EnterpriseBatchDisbursementEngine Unit Tests', () => {
  const validAccount1 = 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4';
  const validAccount2 = 'GBCI2VYK7FMYAOD34B4O76Q7ZJ3Z2Q4AELQY7657C7O4H6H5B6G6T76Y';
  const validContract = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';

  it('plans valid disbursements and partitions into chunks', () => {
    const orders: DisbursementOrder[] = [
      { recipient: validAccount1, token: 'USDC', amount: '10000000' },
      { recipient: validAccount2, token: 'USDC', amount: '20000000' },
      { recipient: validContract, token: 'USDC', amount: '30000000' },
    ];

    const plan = EnterpriseBatchDisbursementEngine.plan(orders, {
      maxOrdersPerChunk: 2,
    });

    assert.equal(plan.totalOrders, 3);
    assert.equal(plan.validOrdersCount, 3);
    assert.equal(plan.rejectedOrdersCount, 0);
    assert.equal(plan.totalVolumeStroops, 60000000n);
    assert.equal(plan.chunks.length, 2);
    assert.equal(plan.chunks[0].orders.length, 2);
    assert.equal(plan.chunks[1].orders.length, 1);
    assert.equal(plan.readyForExecution, true);
  });

  it('rejects invalid recipient addresses', () => {
    const orders: DisbursementOrder[] = [
      { recipient: 'invalid-address', token: 'USDC', amount: '10000000' },
      { recipient: validAccount1, token: 'USDC', amount: '20000000' },
    ];

    const plan = EnterpriseBatchDisbursementEngine.plan(orders);
    assert.equal(plan.validOrdersCount, 1);
    assert.equal(plan.rejectedOrdersCount, 1);
    assert.equal(plan.readyForExecution, false);
    assert.ok(plan.rejectedOrders[0].reason.includes('Invalid Stellar recipient'));
  });

  it('rejects denylisted recipients', () => {
    const denylist = new Set<string>([validAccount2]);
    const orders: DisbursementOrder[] = [
      { recipient: validAccount1, token: 'USDC', amount: '10000000' },
      { recipient: validAccount2, token: 'USDC', amount: '20000000' },
    ];

    const plan = EnterpriseBatchDisbursementEngine.plan(orders, { denylist });
    assert.equal(plan.validOrdersCount, 1);
    assert.equal(plan.rejectedOrdersCount, 1);
    assert.equal(plan.readyForExecution, false);
    assert.ok(plan.rejectedOrders[0].reason.includes('denylisted'));
  });

  it('rejects sub-minimum dusting amounts', () => {
    const orders: DisbursementOrder[] = [
      { recipient: validAccount1, token: 'USDC', amount: '0' },
    ];

    const plan = EnterpriseBatchDisbursementEngine.plan(orders, {
      minPaymentStroops: 100n,
    });
    assert.equal(plan.validOrdersCount, 0);
    assert.equal(plan.rejectedOrdersCount, 1);
    assert.ok(plan.rejectedOrders[0].reason.includes('below minimum gateway threshold'));
  });
});
