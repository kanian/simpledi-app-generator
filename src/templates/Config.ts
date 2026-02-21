import { config } from 'dotenv';
import type { Server } from 'bun';
import { EnvFileNames, Envs, isNotNullNorUndefined } from '@root/lib';
import { Service } from '@kanian77/simple-di';

export const CONFIG = 'Config';
@Service({ token: CONFIG })
export class Config {
  private _server?: Server<any> | undefined;

  private configLoaded: boolean = false;
  private _loadedEnvFile?: EnvFileNames;
  private _connectionString: string = 'placeholder';

  private _port: number = 3000;

  private _jwtSecret: string = 'placeholder';

  constructor(envFile?: EnvFileNames) {
    this.loadEnvFile(envFile);
    this._connectionString = process.env.CONNECTION_STRING ?? 'undefined';
    this._port = process.env.PORT ? Number.parseInt(process.env.PORT) : 3000;
    this._jwtSecret = process.env.JWT_SECRET ?? 'undefined';
  }

  set server(s: Server<any>) {
    this._server = this.server;
  }

  get server(): Server<any> | undefined {
    return this._server;
  }

  get loadedEnvFile() {
    return this._loadedEnvFile;
  }

  set connectionString(name: string) {
    this._connectionString = name;
  }
  get connectionString() {
    return this._connectionString;
  }

  set port(p: number) {
    this._port = p;
  }
  get port() {
    return this._port;
  }

  set jwtSecret(s: string) {
    this._jwtSecret = s;
  }
  get jwtSecret() {
    return this._jwtSecret;
  }

  getConfig() {
    if (!this.configLoaded) {
      this.loadEnvFile();
      this.configLoaded = true;
    }
    return {
      connectionString: this._connectionString,
      port: this._port,

      jwtSecret: this._jwtSecret,
    };
  }

  public loadEnvFile = (envFile?: EnvFileNames) => {
    if (isNotNullNorUndefined(envFile)) {
      config({ path: envFile });
      this._loadedEnvFile = envFile;
      return;
    }
    switch (process.env.BUN_ENV) {
      case Envs.PRODUCTION:
        this._loadedEnvFile = EnvFileNames.PRODUCTION;
        break;
      case Envs.STAGING:
        this._loadedEnvFile = EnvFileNames.STAGING;
        break;
      case Envs.TESTING:
        config({ path: EnvFileNames.TESTING });
        this._loadedEnvFile = EnvFileNames.TESTING;
        break;
      case Envs.DEBUGGING:
        this._loadedEnvFile = EnvFileNames.DEBUGGING;
        break;
      case Envs.DEVELOPMENT:
      default:
        config({ path: EnvFileNames.DEVELOPMENT });
        this._loadedEnvFile = EnvFileNames.DEVELOPMENT;
    }
  };
}
