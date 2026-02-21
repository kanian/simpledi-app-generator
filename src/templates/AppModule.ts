import { Module } from '@kanian77/simple-di';
import { CoreModule } from './core/CoreModule';
import { UseCaseModule } from './use-case/UseCaseModule';
import { Hono } from 'hono';
import { addRoutes } from './main.routes';

export const APP = Symbol('HonoApp');
const app = new Hono();
await addRoutes(app);

export const AppModule = new Module({
  imports: [CoreModule, UseCaseModule],
  providers: [
    {
      provide: APP,
      useValue: app,
    },
  ],
});
