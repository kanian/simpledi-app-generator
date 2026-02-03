import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.development' });

export default defineConfig({
  out: './drizzle-dev',
  schema: './src/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.CONNECTION_STRING!,
  },
});
