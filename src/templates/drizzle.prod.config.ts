import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.prod' });

export default defineConfig({
  out: './drizzle-prod',
  schema: './src/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.CONNECTION_STRING!,
  },
});
