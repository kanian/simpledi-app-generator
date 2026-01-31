import { inject } from '@kanian77/simple-di';
import { Config, CONFIG } from 'config/Config';
import { Envs } from '@root/lib';

export const getCorsOrigin = () => {
  if (
    process.env.BUN_ENV !== Envs.PRODUCTION &&
    process.env.BUN_ENV !== Envs.STAGING
  ) {
    // Filter out undefined/null/empty string if 'result' isn't a valid URL
    // get frontendUrl from config
    const frontendUrl = inject<Config>(CONFIG).frontendUrl;
    console.log('frontendUrl in getCorsOrigin', frontendUrl);
    return ['http://localhost:5173', frontendUrl];
  } else {
    // For production/staging, ensure a valid string or array of strings
    const prodOrigin = process.env.CORS_ORIGIN;
    return prodOrigin ? prodOrigin.split(',').map((s) => s.trim()) : ['*'];
  }
};
