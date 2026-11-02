import express, { Express } from 'express';
import cors from 'cors';
import { SafeguardClient } from '../sdk/client.js';
import { createRouter } from './routes.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import { createRequestIdMiddleware } from './middleware/requestId.js';
import { createSecurityHeadersMiddleware } from './middleware/security.js';

export function createApp(client?: SafeguardClient): Express {
  const app = express();
  const safeguardClient = client || new SafeguardClient();

  app.use(createSecurityHeadersMiddleware());
  app.use(createRequestIdMiddleware());
  app.use(cors());
  app.use(express.json());
  app.use(createRateLimiter());

  app.use(createRouter(safeguardClient));

  return app;
}
