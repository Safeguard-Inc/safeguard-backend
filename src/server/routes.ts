import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SafeguardClient } from '../sdk/client.js';

const ADMIN = 'GC5MCMHHMFV7GOQ7DVN7MOTMHGTMVIP3YFQAAVFZ6WKUE6SLGQBVODW4';
const RECIPIENT = 'GA6LW724VD6PVAG6U3Z3I34D7BOWPO6J7MIJATKGKEC6TYORN4SRCVLT';
const DENYLISTED = 'GCV4I3P3F2OMWYZGRXD5PR5AC3K7MUDSBMKDBPEMJ2MFHLVUAGJEK4DT';
const XLM_SAC = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

export function createRouter(client: SafeguardClient): Router {
  const router = Router();

  const simulateSchema = z.object({
    sender: z.string().min(1, 'Sender address is required'),
    recipient: z.string().min(1, 'Recipient address is required'),
    token: z.string().min(1, 'Token address is required'),
    amount: z.string().regex(/^\d+$/, 'Amount must be an integer string in stroops'),
  });

  // Recent in-memory activity log
  const transactions: Array<{
    id: string;
    sender: string;
    recipient: string;
    token: string;
    amount: string;
    status: 'Approved' | 'Escrowed' | 'Blocked';
    reason: string;
    timestamp: number;
    txHash?: string;
  }> = [
    // Real transactions against the live Testnet payments contract
    // (CDC6KVX7...SRCN). Open any txHash on stellar.expert to verify.
    {
      id: 'tx-1',
      sender: ADMIN,
      recipient: RECIPIENT,
      token: XLM_SAC,
      amount: '500000000', // 50 XLM
      status: 'Approved',
      reason: 'Under the 100 XLM spend cap; settled directly',
      timestamp: Date.parse('2026-10-05T20:59:40Z'),
      txHash: 'c762b42f818387aa584ea33d3da006f22671071ed6e182068994ea6597395e6c',
    },
    {
      id: 'tx-2',
      sender: ADMIN,
      recipient: RECIPIENT,
      token: XLM_SAC,
      amount: '1500000000', // 150 XLM
      status: 'Escrowed',
      reason: 'Exceeds the 100 XLM spend cap; held as escrow #1 (later released)',
      timestamp: Date.parse('2026-10-05T20:59:50Z'),
      txHash: '2d83231685f03b17e1a001e6c82c38453459b4f67b416ef60f9be73133026f0e',
    },
    {
      id: 'tx-3',
      sender: ADMIN,
      recipient: DENYLISTED,
      token: XLM_SAC,
      amount: '10000000', // 1 XLM
      status: 'Blocked',
      reason: 'RecipientDenylisted (#11): rejected at simulation, never submitted',
      timestamp: Date.parse('2026-10-05T21:00:10Z'),
    },
  ];

  // Mirror the live contract's denylist so simulations match on-chain results.
  client.setDenylist([DENYLISTED]);

  /**
   * Health Check
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
   * Simulate a Payment against Policy Rules
   */
  router.post('/api/pay/simulate', async (req: Request, res: Response) => {
    try {
      const parsed = simulateSchema.parse(req.body);
      const result = await client.simulatePayment(parsed);

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
   * Get Active Policies & Limits
   */
  router.get('/api/policies', (_req: Request, res: Response) => {
    // Mirrors SafeguardPayments.get_config() on Testnet. Reading it live over
    // Soroban RPC is tracked as a roadmap issue.
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
   * Get Recent Activity Log
   */
  router.get('/api/transactions', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: transactions,
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
