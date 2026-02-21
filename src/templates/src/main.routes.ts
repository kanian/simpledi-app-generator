import { Hono } from 'hono';
import { join, dirname } from 'path';

import { fileURLToPath } from 'url';

export const addRoutes = async (app: Hono): Promise<void> => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const useCasesDir = join(__dirname, 'use-case');
  const routeFiles: string[] = [];

  const glob = new Bun.Glob('**/*Routes.{ts,js}');
  for await (const file of glob.scan({ cwd: useCasesDir })) {
    routeFiles.push(join(useCasesDir, file));
  }

  for (const filePath of routeFiles) {
    const routeModule = await import(filePath);

    if (routeModule.Route && routeModule.Path) {
      console.log(`Registering route: ${routeModule.Path}`);
      app.route(routeModule.Path, routeModule.Route);
    }
  }
};
