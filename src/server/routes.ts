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
    useCache: z.boolean().optional(),
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
      const useCache = req.query.cache === 'true' || Boolean(parsed.useCache);
      const result = await client.simulatePayment(parsed, useCache);

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
      let approvedCount = 0;
      let escrowedCount = 0;
      let blockedCount = 0;
      let totalApprovedStroops = 0n;
      let totalEscrowedStroops = 0n;
      let totalBlockedStroops = 0n;

      for (const item of parsed.payments) {
        const sim = await client.simulatePayment(item);
        const amt = BigInt(item.amount);
        if (sim.decision === 'APPROVE') {
          approvedCount++;
          totalApprovedStroops += amt;
        } else if (sim.decision === 'FLAG') {
          escrowedCount++;
          totalEscrowedStroops += amt;
        } else {
          blockedCount++;
          totalBlockedStroops += amt;
        }
        results.push({ input: item, verdict: sim });
      }

      res.json({
        success: true,
        count: results.length,
        summary: {
          approvedCount,
          escrowedCount,
          blockedCount,
          totalApprovedStroops: totalApprovedStroops.toString(),
          totalEscrowedStroops: totalEscrowedStroops.toString(),
          totalBlockedStroops: totalBlockedStroops.toString(),
        },
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
  /**
   * Get Supported SAC Tokens
   */
  router.get('/api/tokens', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: client.getSupportedTokens(),
    });
  });

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
   * Get Persistent Activity Log with optional pagination & status filtering
   */
  /**
   * Get Aggregate Compliance & Telemetry Stats
   */
  router.get('/api/stats', (_req: Request, res: Response) => {
    const stats = defaultStore.getComplianceStats();
    res.json({
      success: true,
      data: stats,
    });
  });

  router.get('/api/transactions', (req: Request, res: Response) => {
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
    const status = req.query.status as string | undefined;

    const result = defaultStore.getPaginatedTransactions({
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 100 : limit,
      status,
    });

    res.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * Get Active and Settled Escrows (with optional pagination)
   */
  router.get('/api/escrows', (req: Request, res: Response) => {
    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    const status = req.query.status as 'Pending' | 'Released' | 'Refunded' | undefined;

    if (pageParam !== undefined || limitParam !== undefined) {
      const page = pageParam ? parseInt(String(pageParam), 10) : 1;
      const limit = limitParam ? parseInt(String(limitParam), 10) : 50;
      const result = defaultStore.getPaginatedEscrows({
        page: isNaN(page) ? 1 : page,
        limit: isNaN(limit) ? 50 : limit,
        status,
      });
      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } else {
      const escrows = defaultStore.getEscrows(status);
      res.json(escrows);
    }
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

  /**
   * Live Server-Sent Events (SSE) Stream for ledger and indexer notifications
   */
  router.get('/api/events/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const initial = JSON.stringify({
      type: 'connected',
      timestamp: Date.now(),
      status: defaultIndexer.getStatus(),
    });
    res.write(`data: ${initial}\n\n`);

    const interval = setInterval(() => {
      const data = JSON.stringify({
        type: 'heartbeat',
        timestamp: Date.now(),
        indexer: defaultIndexer.getStatus(),
        recentTxs: defaultStore.getTransactions(5).length,
      });
      res.write(`data: ${data}\n\n`);
    }, 15_000);

    req.on('close', () => {
      clearInterval(interval);
    });
  });

  /**
   * OpenAPI Specification Endpoint
   */
  router.get('/api/openapi.json', (_req: Request, res: Response) => {
    res.json({
      openapi: '3.1.0',
      info: {
        title: 'Safeguard Compliance & Payment Gateway API',
        version: '0.1.0',
        description: 'REST API for pre-flight compliance simulation, Soroban contract event ingestion, and escrow management on Stellar.',
      },
      paths: {
        '/health': { get: { summary: 'Basic service health check' } },
        '/health/deep': { get: { summary: 'Deep RPC and indexer diagnostics' } },
        '/api/pay/simulate': { post: { summary: 'Simulate a single payment against on-chain policies' } },
        '/api/pay/simulate-batch': { post: { summary: 'Batch simulate enterprise payroll or treasury payouts' } },
        '/api/transactions': { get: { summary: 'List recent on-chain and simulated transactions' } },
        '/api/escrows': { get: { summary: 'List pending and settled escrows' } },
        '/api/denylist/check/{address}': { get: { summary: 'Check if an address is denylisted' } },
        '/api/events/stream': { get: { summary: 'Server-Sent Events live status stream' } },
      },
    });
  });

  /**
   * Interactive Swagger UI HTML Documentation
   */
  router.get('/docs', (_req: Request, res: Response) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Safeguard API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>body { margin: 0; background: #0f172a; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout"
    });
  </script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  return router;
}
