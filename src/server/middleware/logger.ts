/**
 * logger.ts
 *
 * Production structured JSON logging middleware.
 * Captures request correlation ID, HTTP method, path, response status,
 * duration in milliseconds, IP, and user-agent for observability pipelines.
 */

import { Request, Response, NextFunction } from 'express';

export interface StructuredLog {
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userAgent?: string;
  ip?: string;
  contentLength?: number;
}

export function createStructuredLogger(
  customWriter?: (entry: StructuredLog) => void
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const durationMs = Number((end - start) / 1000000n);

      const entry: StructuredLog = {
        timestamp: new Date().toISOString(),
        requestId:
          (req.headers['x-request-id'] as string) ||
          (res.getHeader('x-request-id') as string) ||
          '',
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs,
        userAgent: req.get('user-agent'),
        ip: req.ip || req.socket.remoteAddress,
        contentLength: res.getHeader('content-length')
          ? parseInt(String(res.getHeader('content-length')), 10)
          : undefined,
      };

      if (customWriter) {
        customWriter(entry);
      } else if (process.env.NODE_ENV !== 'test') {
        process.stdout.write(JSON.stringify(entry) + '\n');
      }
    });

    next();
  };
}
