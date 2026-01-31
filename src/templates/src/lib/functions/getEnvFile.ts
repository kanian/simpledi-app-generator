import { EnvFileNames } from '../types/EnvFileNames';
import { Envs } from '../types/Envs';

export const getEnvFile = () => {
  switch (process.env.BUN_ENV) {
    case Envs.DEVELOPMENT:
      return EnvFileNames.DEVELOPMENT;
    case Envs.TESTING:
      return EnvFileNames.TESTING;
    case Envs.PRODUCTION:
      return EnvFileNames.PRODUCTION;
    case Envs.DEBUGGING:
      return EnvFileNames.DEBUGGING;
    case Envs.STAGING:
      return EnvFileNames.STAGING;
    default:
      return undefined;
  }
};
