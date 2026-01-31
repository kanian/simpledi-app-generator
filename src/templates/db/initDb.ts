import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@root/schema';
import { CONFIG, Config } from 'config/Config';
import { inject, registerValue } from '@kanian77/simple-di';
export function initDb() {
  const client = neon(inject<Config>(CONFIG).connectionString);
  const db = drizzle(client, { schema });
  registerValue('db', db);
  return db;
}
