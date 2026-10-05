import express, { Express } from 'express';
import cors from 'cors';
import { SafeguardClient } from '../sdk/client.js';
import { createRouter } from './routes.js';

export function createApp(client?: SafeguardClient): Express {
  const app = express();
  const safeguardClient = client || new SafeguardClient();

  app.use(cors());
  app.use(express.json());

  app.use(createRouter(safeguardClient));

  return app;
}
