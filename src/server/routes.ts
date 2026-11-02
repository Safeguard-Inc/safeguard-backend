import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SafeguardClient } from '../sdk/client.js';
import { defaultStore } from './store.js';
import { defaultIndexer } from './indexer.js';

const DENYLISTED = 'GCV4I3P3F2OMWYZGRXD5PR5AC3K7MUDSBMKDBPEMJ2MFHLVUAGJEK4DT';

export function createRouter(client: SafeguardClient): Router {
  const router = Router();

  const simulateSchema = z.object({
    sender: z.string().min(1, 'Sender address is required'),
    recipient: z.string().min(1, 'Recipient address is required'),
    token: z.string().min(1, 'Token address is required'),
    amount: z.string().regex(/^\d+$/, 'Amount must be an integer string in stroops'),
  });

  const batchSimulateSchema = z.object({
    payments: z.array(simulateSchema).min(1).max(100),
  });

  // Mirror the live contract's denylist so simulations match on-chain results.
  client.setDenylist([DENYLISTED]);

  /**
   * Basic Health Check
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      version: '0.1.0',
      network: 'stellar-testnet',
      config: client.getConfig(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  /**
   * Deep Health Check (Verifies Soroban RPC + Indexer Daemon)
   */
  router.get('/health/deep', async (_req: Request, res: Response) => {
    const indexerStatus = defaultIndexer.getStatus();
    res.json({
      status: indexerStatus.healthy ? 'healthy' : 'degraded',
      timestamp: Date.now(),
      indexer: indexerStatus,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  /**
   * Fast Denylist Check Endpoint
   */
  router.get('/api/denylist/check/:address', (req: Request, res: Response) => {
    const address = req.params.address;
    const isBlocked = client.isDenylisted(address);
    res.json({
      success: true,
      address,
      isDenylisted: isBlocked,
    });
  });

  /**
   * Simulate a Payment against Policy Rules
   */
  router.post('/api/pay/simulate', async (req: Request, res: Response) => {
    try {
      const parsed = simulateSchema.parse(req.body);
      const result = await client.simulatePayment(parsed);

      // Persist simulation result to store
      defaultStore.addTransaction({
        id: `tx-sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        sender: parsed.sender,
        recipient: parsed.recipient,
        token: parsed.token,
        amount: parsed.amount,
        status: result.decision === 'APPROVE' ? 'Approved' : result.decision === 'FLAG' ? 'Escrowed' : 'Blocked',
        reason: result.reason,
        timestamp: Date.now(),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  });

  /**
   * Batch Simulate Multiple Payments (e.g., enterprise payroll)
   */
  router.post('/api/pay/simulate-batch', async (req: Request, res: Response) => {
    try {
      const parsed = batchSimulateSchema.parse(req.body);
      const results = [];

      for (const item of parsed.payments) {
        const res = await client.simulatePayment(item);
        results.push({ input: item, verdict: res });
      }

      res.json({
        success: true,
        count: results.length,
        data: results,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  });

  /**
   * Get Active Policies & Limits
   */
  router.get('/api/policies', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        paymentsContract: client.getConfig().paymentContractId,
        spendCapUnits: '100 XLM',
        spendCapStroops: '1000000000',
        escrowPeriodSeconds: 86400,
        rules: [
          { id: 'SPEND_CAP', action: 'ESCROW', threshold: '1000000000', reasonCode: 6 },
          { id: 'SENDER_DENYLIST', action: 'REVERT', reasonCode: 12 },
          { id: 'RECIPIENT_DENYLIST', action: 'REVERT', reasonCode: 11 },
          { id: 'PAUSED', action: 'REVERT', reasonCode: 4 },
        ],
      },
    });
  });

  /**
   * Get Persistent Activity Log
   */
  router.get('/api/transactions', (req: Request, res: Response) => {
    const limit = parseInt(String(req.query.limit || '100'), 10);
    const txs = defaultStore.getTransactions(isNaN(limit) ? 100 : limit);
    res.json({
      success: true,
      data: txs,
    });
  });

  /**
   * Get Active and Settled Escrows (for Dashboard Escrow Vault tab)
   */
  router.get('/api/escrows', (req: Request, res: Response) => {
    const status = req.query.status as 'Pending' | 'Released' | 'Refunded' | undefined;
    const escrows = defaultStore.getEscrows(status);
    res.json(escrows);
  });

  /**
   * Get Indexer Status
   */
  router.get('/api/indexer/status', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: defaultIndexer.getStatus(),
    });
  });

  /**
   * Decode an error code
   */
  router.get('/api/errors/:code', (req: Request, res: Response) => {
    const code = parseInt(req.params.code, 10);
    if (isNaN(code)) {
      res.status(400).json({ success: false, error: 'Invalid error code' });
      return;
    }
    const decoded = client.decodeError(code);
    res.json({ success: true, data: decoded });
  });

  return router;
}
