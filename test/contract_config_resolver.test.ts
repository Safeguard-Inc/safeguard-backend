import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ContractConfigResolver,
  PaymentGatewayConfigPayload,
} from '../src/sdk/contractConfigResolver';

describe('ContractConfigResolver Unit Tests', () => {
  const optimalConfig: PaymentGatewayConfigPayload = {
    admin: 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4',
    pendingAdmin: null,
    policyContract: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    guardian: 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT',
    escrowPeriod: 3600,
    spendCapStroops: '500000000', // 50 XLM
    minPaymentAmountStroops: '1',
    isPaused: false,
    requireAllowlist: false,
    totalVolumeStroops: '10000000000',
    paymentSequence: 42,
  };

  it('evaluates optimal configuration as healthy with zero issues', () => {
    const health = ContractConfigResolver.evaluateHealth(optimalConfig);
    assert.equal(health.healthy, true);
    assert.equal(health.status, 'OPTIMAL');
    assert.equal(health.issues.length, 0);
  });

  it('detects uninitialized admin', () => {
    const badAdmin = { ...optimalConfig, admin: '' };
    const health = ContractConfigResolver.evaluateHealth(badAdmin);
    assert.equal(health.healthy, false);
    assert.equal(health.status, 'UNINITIALIZED');
  });

  it('detects paused contract state from circuit breaker', () => {
    const paused = { ...optimalConfig, isPaused: true };
    const health = ContractConfigResolver.evaluateHealth(paused);
    assert.equal(health.healthy, false);
    assert.equal(health.status, 'PAUSED');
    assert.ok(health.issues[0].includes('paused'));
  });

  it('flags degraded status when policy contract is missing or spend cap is 0', () => {
    const degraded = {
      ...optimalConfig,
      policyContract: null,
      spendCapStroops: '0',
    };
    const health = ContractConfigResolver.evaluateHealth(degraded);
    assert.equal(health.status, 'DEGRADED');
    assert.ok(health.issues.length >= 2);
  });

  it('formats stroop amounts to localized XLM strings', () => {
    assert.equal(ContractConfigResolver.formatStroops('500000000'), '50.00');
    assert.equal(ContractConfigResolver.formatStroops('10000000'), '1.00');
    assert.equal(ContractConfigResolver.formatStroops('invalid'), '0.00');
  });

  it('validates Stellar accounts and Soroban contract addresses', () => {
    assert.equal(
      ContractConfigResolver.isValidAddress('GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4'),
      true
    );
    assert.equal(
      ContractConfigResolver.isValidAddress('CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM'),
      true
    );
    assert.equal(ContractConfigResolver.isValidAddress('invalid-key'), false);
    assert.equal(ContractConfigResolver.isValidAddress(''), false);
    assert.equal(ContractConfigResolver.isValidAddress(null), false);
  });
});
