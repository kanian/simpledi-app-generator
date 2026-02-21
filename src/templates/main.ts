import 'reflect-metadata';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { CONFIG, Config } from 'config/Config';
import { bootstrap, inject } from '@kanian77/simple-di';
import { APP, AppModule } from '@root/AppModule';
import { getCorsOrigin } from '@root/lib/types/getCorsOrigin';
import { getHostname } from '@root/lib/functions/getHostname';

// bootstraps DI container
console.log('Bootstrapping DI container...');
bootstrap(AppModule);
console.log('DI container bootstrapped.');

const app = inject<Hono>(APP);
console.log('created Hono');

// cors to accept from origin 'http://localhost:5173'
console.log('setting up cors');
console.log('CORS origin:', getCorsOrigin());
app
  .use(
    '*',
    cors({
      origin: (requestOriginValue, c) => {
        const allowedOrigins = getCorsOrigin(); // Get current allowed origins

        if (!requestOriginValue) {
          return null;
        }

        if (allowedOrigins.includes(requestOriginValue)) {
          console.log(`[CORS Check] Origin ${requestOriginValue} IS ALLOWED.`);
          return requestOriginValue;
        } else {
          console.warn(
            `[CORS Check] Origin ${requestOriginValue} IS NOT ALLOWED.`,
          );
          return null;
        }
      },
      allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'], // Includes OPTIONS for preflight
      allowHeaders: [
        'Content-Type',
        'Authorization',
        'content-type',
        'authorization',
        'X-Requested-With',
        'X-Pinggy-No-Screen',
      ],
      maxAge: 600,
      credentials: true,
    }),
  )
  .use('*', (c, next) => {
    // Log the request method and URL
    console.log(`[Request] ${c.req.method} ${c.req.url}`);
    return next();
  });

app.use('*', logger());
app.use('*', prettyJSON());

console.log('about to create Bun server');

console.log('Debug info:');
console.log('process.env.BUN_ENV:', process.env.BUN_ENV);
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('Resolved hostname:', getHostname());
console.log(
  'About to start server on hostname:',
  getHostname(),
  `port: ${process.env.PORT || 3000}`,
);
const server = Bun.serve({
  fetch: app.fetch,
  hostname: getHostname(),
  port: process.env.PORT || 3000,
});

inject<Config>(CONFIG).server = server;

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.stop();
  process.exit(0);
});
