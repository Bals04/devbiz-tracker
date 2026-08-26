import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { getEnv } from './config/env.js';

export function createApp() {
  const env = getEnv();
  const app = express();
  app.disable('x-powered-by');

  // Behind Vercel (or any reverse proxy) the socket address is the proxy, not
  // the visitor. Without this, req.ip is useless and the login rate limiter
  // would bucket every request together.
  if (process.env.VERCEL || env.NODE_ENV === 'production') app.set('trust proxy', true);

  app.use(helmet({ contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false }));
  app.use(cors({ origin: env.CLIENT_ORIGIN.split(',').map((item) => item.trim()), credentials: true }));
  app.use(express.json({ limit: '250kb' }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use('/api', apiRouter);

  // Single-process deployments (Render, Railway, Docker, a VPS) serve the built
  // SPA from here. On Vercel the frontend is static-hosted on the CDN and only
  // /api/* reaches this function, so serving dist through a lambda would be
  // pure waste — and dist is not even bundled with the function.
  if (env.NODE_ENV === 'production' && !process.env.VERCEL) {
    const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
    app.use(express.static(directory));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(directory, 'index.html')));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
