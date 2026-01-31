import { inject } from '@kanian77/simple-di';
import { initDb } from './initDb';
let db: any = null;

export function getDb() {
  if (!db) {
    db = initDb();
    return db;
  }
  return inject('db');
}
