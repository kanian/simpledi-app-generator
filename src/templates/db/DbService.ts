import { inject, Inject, Service } from '@kanian77/simple-di';
import { neon } from '@neondatabase/serverless';
import { Config, CONFIG } from 'config/Config';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@root/schema';

export const DB_SERVICE = 'DbService';
@Service({ token: DB_SERVICE })
export class DbService {
  private db: any;
  constructor(@Inject(CONFIG) private config: Config) {
    const client = neon(this.config.connectionString);
    this.db = drizzle(client, { schema: schema });
  }
  getDb() {
    return this.db;
  }
}
