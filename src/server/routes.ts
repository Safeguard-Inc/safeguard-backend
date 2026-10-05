import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SafeguardClient } from '../sdk/client.js';

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
    {
      id: 'tx-1',
      sender: 'GBBM6WDF6SMPGMBCQXAWOJZZQB65SUWAAK4EDLOH7OQH226BC4STTU3V',
      recipient: 'GC2U3YSOCCLOHKADJ4INRHJDFVDMGZX3WWTPH7V62MQWETUD4LR4HDCA',
      token: 'CBLQLJAG72M4XQRJMQHSKYIFVHQD7LNTNOQH2GRMCMBWMSLBSLTGTJC7',
      amount: '50000000', // 5 USDC
      status: 'Approved',
      reason: 'Direct settlement under spend cap',
      timestamp: Date.now() - 360000,
      txHash: '4c5759298c0364b01d386a5935b964532b04978ea595d96d904d9011f58d64b8',
    },
    {
      id: 'tx-2',
      sender: 'GBBM6WDF6SMPGMBCQXAWOJZZQB65SUWAAK4EDLOH7OQH226BC4STTU3V',
      recipient: 'GC2O7PSLQXL24R7EECSMZC7YD5IB7QP5COX2FHC52SVKREEDSX2WWPWV',
      token: 'CBLQLJAG72M4XQRJMQHSKYIFVHQD7LNTNOQH2GRMCMBWMSLBSLTGTJC7',
      amount: '25000000000', // 2,500 USDC
      status: 'Escrowed',
      reason: 'Exceeds instantaneous spend cap (1,000 USDC); held in Escrow',
      timestamp: Date.now() - 180000,
      txHash: '1ddad388f914e267b282855ddc8e5478fabfb8542e7798e4402447e5341e3f9a',
    },
    {
      id: 'tx-3',
      sender: 'GBBM6WDF6SMPGMBCQXAWOJZZQB65SUWAAK4EDLOH7OQH226BC4STTU3V',
      recipient: 'GBLOCKEDWALLET99999999999999999999999999999999999999999999',
      token: 'CBLQLJAG72M4XQRJMQHSKYIFVHQD7LNTNOQH2GRMCMBWMSLBSLTGTJC7',
      amount: '100000000', // 10 USDC
      status: 'Blocked',
      reason: 'Recipient address on active sanctions/denylist',
      timestamp: Date.now() - 60000,
    },
  ];

  // Seed default denylist addresses for demo
  client.setDenylist([
    'GBLOCKEDWALLET99999999999999999999999999999999999999999999',
    'GSANCTIONEDTESTNETADDR00000000000000000000000000000000000',
  ]);

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
    res.json({
      success: true,
      data: {
        activeVersion: 'v1.2.0',
        spendCapUnits: '1,000.00 USDC',
        spendCapStroops: '10000000000',
        escrowGracePeriodSeconds: 86400,
        rules: [
          {
            id: 'RULE-SPEND-CAP-001',
            type: 'SpendCap',
            action: 'FLAG_TO_ESCROW',
            threshold: '10000000000',
            status: 'ACTIVE',
          },
          {
            id: 'RULE-DENYLIST-002',
            type: 'Denylist',
            action: 'REVERT_BLOCK',
            status: 'ACTIVE',
          },
          {
            id: 'RULE-ALLOWLIST-003',
            type: 'Allowlist',
            action: 'PASS_THROUGH',
            status: 'OPTIONAL',
          },
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
