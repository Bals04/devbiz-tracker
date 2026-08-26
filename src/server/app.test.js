import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-with-safe-length';

const { createApp } = await import('./app.js');
let server;
let baseUrl;

beforeAll(async () => {
  await new Promise((resolve) => {
    server = createApp().listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

describe('Express application', () => {
  it('serves the public health check', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
  });

  it('protects application API routes', async () => {
    const response = await fetch(`${baseUrl}/api/clients`);
    expect(response.status).toBe(401);
  });
});
