import { Envs } from '@root/lib';

/**
 * Returns the hostname based on the current environment.
 * @returns The hostname based on the current environment.
 */
export function getHostname(): string {
  const env = process.env.BUN_ENV || Envs.DEVELOPMENT;
  console.log(`getHostname: Current environment is ${env}`);
  if (env === Envs.PRODUCTION || env === Envs.STAGING) {
    console.warn(
      `getHostname: Running in ${env} environment, returning '0.0.0.0')`,
    );
    return '0.0.0.0';
  } else {
    return 'localhost';
  }
}
