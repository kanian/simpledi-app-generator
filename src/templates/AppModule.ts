import { Module } from '@kanian77/simple-di';
import { CoreModule } from './core/CoreModule';
import { UseCaseModule } from './use-case/UseCaseModule';

export const AppModule = new Module({
  imports: [CoreModule, UseCaseModule],
});
