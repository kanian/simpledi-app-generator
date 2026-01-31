import { Module } from '@kanian77/simple-di';
import { Config, CONFIG } from './Config';
import { getEnvFile, type EnvFileNames } from '@root/lib';
export const getConfigModule = (envFile?: EnvFileNames) =>
  new Module({
    providers: [
      {
        provide: CONFIG,
        useFactory: () => new Config(envFile || getEnvFile()),
      },
    ],
  });
