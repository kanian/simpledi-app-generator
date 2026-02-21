import { serve } from '@hono/node-server';
import type { Hono } from 'hono';
import supertest from 'supertest';

export const getTestServer = (app: Hono, port?: number) => {
  const usePort = port || 3001 + Math.floor(Math.random() * 10000);

  const server = serve({ port: usePort, fetch: app.fetch });

  return {
    request: () => supertest(server),
    app,
    port: usePort,
    close: () => {
      return new Promise<boolean>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            console.error(`Error closing server on port ${usePort}:`, err);
            reject(err);
          } else {
            console.log(`Server on port ${usePort} successfully closed`);
            resolve(true);
          }
        });
      });
    },
  };
};

export type TestServer = ReturnType<typeof getTestServer>;
