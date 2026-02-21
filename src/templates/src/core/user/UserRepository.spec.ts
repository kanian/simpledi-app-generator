import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { UserRepository } from './UserRepository';
import { randomUUIDv7 } from 'bun';
import * as schema from '@root/schema';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import {
  EnvFileNames,
} from '@root/lib';
import { USER_REPOSITORY_INTERFACE } from './IUserRepository';
import { bootstrap, inject, Module } from '@kanian77/simple-di';
import { DB_SERVICE, DbService } from 'db/DbService';
import { getConfigModule } from 'config/getConfigModule';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let db: NeonHttpDatabase<typeof schema>;

  const clear = async (db: NeonHttpDatabase<typeof schema>) => {
    // await db.delete(schema.userSchema).execute();
  };

  beforeAll(async () => {
    const ConfigModule = getConfigModule(EnvFileNames.TESTING);
    const DbModule = getConfigModule(EnvFileNames.TESTING);

    const UserRepositoryModule = new Module({
      imports: [ConfigModule, DbModule],
      providers: [
        {
          provide: USER_REPOSITORY_INTERFACE,
          useClass: UserRepository,
        },
      ],
    });

    const TestModule = new Module({
      imports: [
        ConfigModule,
        DbModule,
        UserRepositoryModule,
      ],
    });

    bootstrap(TestModule);

    db = inject<DbService>(DB_SERVICE).getDb();
    userRepository = inject<UserRepository>(USER_REPOSITORY_INTERFACE);

    await clear(db);
  });

  afterEach(async () => {
    // await db.delete(schema.userSchema).execute();
  });

  afterAll(async () => {
    await clear(db);
  });

  it('should be defined', () => {
    expect(userRepository).toBeDefined();
  });
});
