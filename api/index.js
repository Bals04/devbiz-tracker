import { createApp } from '../src/server/app.js';

/**
 * Vercel serverless entry point for the Express API.
 *
 * Vercel never runs src/server/index.js, because that calls app.listen() and
 * expects a long-lived process. Instead it imports this module once per
 * instance and invokes the exported handler per request. An Express app is
 * itself a (req, res) handler, so it can be delegated to directly.
 *
 * The app is created at module scope so warm invocations reuse it rather than
 * rebuilding the middleware stack on every request.
 */
const app = createApp();

export default function handler(req, res) {
  // vercel.json rewrites /api/* here. The router is mounted at /api, so make
  // sure the path Express sees still carries that prefix regardless of how the
  // rewrite resolved the URL.
  if (!req.url.startsWith('/api')) {
    req.url = req.url === '/' ? '/api' : `/api${req.url}`;
  }

  return app(req, res);
}
