import { Module } from '@kanian77/simple-di';
import { DB_SERVICE, DbService } from './DbService';
import { getConfigModule } from 'config/getConfigModule';
import { EnvFileNames, getEnvFile } from '@root/lib';

export const getDbModule = (envFile?: EnvFileNames) =>
  new Module({
    imports: [getConfigModule(envFile || getEnvFile())],
    providers: [
      {
        provide: DB_SERVICE,
        useClass: DbService,
      },
    ],
  });
