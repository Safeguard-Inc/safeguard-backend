import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Attaches a unique correlation ID (`x-request-id`) to incoming requests and sets
 * the header on outgoing responses for audit tracing.
 */
export function createRequestIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const incomingId = req.headers['x-request-id'];
    const requestId =
      typeof incomingId === 'string' && incomingId.trim().length > 0
        ? incomingId
        : randomUUID();

    req.id = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  };
}

