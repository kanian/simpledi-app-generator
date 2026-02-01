import { mkdir, writeFile, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import {
  toPascalCase,
  toCamelCase,
  toKebabCase,
  toUpperSnakeCase,
} from './lib/stringUtils.js';

export async function createUseCase(
  rawName: string,
  imports: string[] = [],
): Promise<void> {
  if (!rawName) {
    throw new Error('Use case name is required');
  }

  const EntityName = toPascalCase(rawName); // e.g. GetUser
  const entityName = toCamelCase(rawName); // e.g. getUser
  const kebabName = toKebabCase(rawName); // e.g. get-user
  const TOKEN_BASE = toUpperSnakeCase(rawName); // e.g. GET_USER

  console.log(`Creating use case: ${EntityName}`);
  console.log(`Directory: src/use-case/${kebabName}`);
  if (imports.length > 0) {
    console.log(`Imports: ${imports.join(', ')}`);
  }

  const srcDir = resolve(process.cwd(), 'src');
  const targetDir = resolve(srcDir, 'use-case', kebabName);
  const outputsDir = resolve(targetDir, 'outputs');

  if (existsSync(targetDir)) {
    throw new Error(`Directory ${targetDir} already exists`);
  }

  await mkdir(targetDir, { recursive: true });
  await mkdir(outputsDir, { recursive: true });

  // Build module imports from entity names
  // e.g., "user" -> import { UserModule } from '@root/core/user/UserModule';
  const moduleImports = imports.map((entityName) => {
    const pascalName = toPascalCase(entityName);
    const kebab = toKebabCase(entityName);
    return {
      moduleName: `${pascalName}Module`,
      importPath: `@root/core/${kebab}/${pascalName}Module`,
    };
  });

  // Generate import statements for the use case file
  const moduleImportStatements = moduleImports
    .map((m) => `import { ${m.moduleName} } from '${m.importPath}';`)
    .join('\n');

  // Generate the imports array content
  const moduleImportsArray = moduleImports.map((m) => m.moduleName).join(', ');

  // 1. <Name>Success.ts (Output)
  const successContent = `import { SuccessfullOperation } from '@root/lib';

export type ${EntityName}Payload = {
  // TODO: Define payload properties
};

export class ${EntityName}Success extends SuccessfullOperation {
  constructor(
    result: ${EntityName}Payload,
    message: string = '${EntityName} executed successfully',
  ) {
    super(message);
    this.result = result;
  }
}
`;

  // 2. <Name>Failure.ts (Output)
  const failureContent = `import { FailedOperation } from '@root/lib';

export class ${EntityName}Failure extends FailedOperation {
  constructor(
    message: string = '${EntityName} failed to execute',
  ) {
    super(message);
  }
}
`;

  // 3. <Name>.ts (Use Case Class + Module)
  const useCaseContent = `import { Module, Service } from '@kanian77/simple-di';
import {
  ${EntityName}Success,
  type ${EntityName}Payload,
} from './outputs/${EntityName}Success';
import type { IUseCase } from '../IUseCase';
${moduleImportStatements ? moduleImportStatements + '\n' : ''}
export const ${TOKEN_BASE}_USE_CASE_TOKEN = '${TOKEN_BASE}_USE_CASE';

@Service({
  token: ${TOKEN_BASE}_USE_CASE_TOKEN,
  lifecycle: 'transient',
})
export class ${EntityName} implements IUseCase {
  constructor() {}

  async execute(): Promise<${EntityName}Success> {
    const result: ${EntityName}Payload = {
      // TODO: Implement use case logic
    };

    return new ${EntityName}Success(result);
  }
}

export const ${EntityName}Module = new Module({
  imports: [${moduleImportsArray}],
  providers: [
    {
      provide: ${TOKEN_BASE}_USE_CASE_TOKEN,
      useClass: ${EntityName},
    },
  ],
});
`;

  // 4. <name>Routes.ts (Route Handler)
  const routesContent = `import { Hono } from 'hono';
import { StatusCodes } from 'http-status-codes';
import { inject } from '@kanian77/simple-di';
import { ${EntityName}, ${TOKEN_BASE}_USE_CASE_TOKEN } from './${EntityName}';
import { ${EntityName}Failure } from './outputs/${EntityName}Failure';

const ${entityName}Routes = new Hono();

${entityName}Routes.get('/', async (c) => {
  try {
    const useCase = inject<${EntityName}>(${TOKEN_BASE}_USE_CASE_TOKEN);
    const result = await useCase.execute();

    return c.json(result, StatusCodes.OK);
  } catch (e) {
    console.error('Error in ${entityName}Routes:', e);
    return c.json(
      new ${EntityName}Failure('Internal Server Error'),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
});

const ${entityName}RoutesPath = '/${kebabName}';

export { ${entityName}Routes, ${entityName}RoutesPath };
`;

  // Write files
  const files = [
    {
      path: join(outputsDir, `${EntityName}Success.ts`),
      content: successContent,
    },
    {
      path: join(outputsDir, `${EntityName}Failure.ts`),
      content: failureContent,
    },
    { path: join(targetDir, `${EntityName}.ts`), content: useCaseContent },
    { path: join(targetDir, `${entityName}Routes.ts`), content: routesContent },
  ];

  for (const file of files) {
    await writeFile(file.path, file.content);
    console.log(`Created: ${file.path.replace(process.cwd() + '/', '')}`);
  }

  // Auto-Registration

  // 1. src/use-case/UseCaseModule.ts
  const useCaseModulePath = join(srcDir, 'use-case', 'UseCaseModule.ts');
  if (existsSync(useCaseModulePath)) {
    let content = await readFile(useCaseModulePath, 'utf8');
    const importStatement = `import { ${EntityName}Module } from './${kebabName}/${EntityName}';`;

    if (!content.includes(importStatement)) {
      // Add import after last import
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', lastImportIndex);
        content =
          content.slice(0, nextLineIndex + 1) +
          importStatement +
          '\n' +
          content.slice(nextLineIndex + 1);
      } else {
        content = importStatement + '\n' + content;
      }

      // Add to imports array
      const importsRegex = /imports:\s*\[/g;
      const match = importsRegex.exec(content);
      if (match) {
        const arrayStart = match.index + match[0].length;
        let depth = 1;
        let endIndex = -1;
        for (let i = arrayStart; i < content.length; i++) {
          if (content[i] === '[') depth++;
          if (content[i] === ']') depth--;
          if (depth === 0) {
            endIndex = i;
            break;
          }
        }

        if (endIndex !== -1) {
          const arrayContent = content.slice(arrayStart, endIndex);
          if (!arrayContent.includes(`${EntityName}Module`)) {
            const trimmed = arrayContent.trim();
            const hasTrailingComma = trimmed.endsWith(',');
            const separator =
              trimmed.length > 0 && !hasTrailingComma ? ', ' : '';
            const insertion = `${separator}${EntityName}Module`;
            content =
              content.slice(0, endIndex) + insertion + content.slice(endIndex);
          }
        }
      }

      await writeFile(useCaseModulePath, content);
      console.log(`Updated: src/use-case/UseCaseModule.ts`);
    }
  } else {
    console.warn('Warning: src/use-case/UseCaseModule.ts not found');
  }

  // 2. src/main.routes.ts
  const mainRoutesPath = join(srcDir, 'main.routes.ts');
  if (existsSync(mainRoutesPath)) {
    let content = await readFile(mainRoutesPath, 'utf8');
    const importStatement = `import {\n  ${entityName}Routes,\n  ${entityName}RoutesPath,\n} from './use-case/${kebabName}/${entityName}Routes';`;

    if (!content.includes(`${entityName}Routes`)) {
      // Add import after last import
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        // Find the end of this import (could be multi-line)
        let searchPos = lastImportIndex;
        let importEndIndex = -1;

        // Look for the semicolon that ends the import
        while (searchPos < content.length) {
          if (content[searchPos] === ';') {
            importEndIndex = searchPos;
            break;
          }
          searchPos++;
        }

        if (importEndIndex !== -1) {
          content =
            content.slice(0, importEndIndex + 1) +
            '\n' +
            importStatement +
            content.slice(importEndIndex + 1);
        }
      } else {
        content = importStatement + '\n' + content;
      }

      // Add route registration before export
      const routeRegistration = `mainRoutes.route(${entityName}RoutesPath, ${entityName}Routes);`;

      if (!content.includes(routeRegistration)) {
        // Find line before 'export { mainRoutes }'
        const exportIndex = content.indexOf('export { mainRoutes }');
        if (exportIndex !== -1) {
          content =
            content.slice(0, exportIndex) +
            routeRegistration +
            '\n\n' +
            content.slice(exportIndex);
        } else {
          // Fallback: add before last line
          const lines = content.split('\n');
          lines.splice(lines.length - 1, 0, routeRegistration);
          content = lines.join('\n');
        }
      }

      await writeFile(mainRoutesPath, content);
      console.log(`Updated: src/main.routes.ts`);
    }
  } else {
    console.warn('Warning: src/main.routes.ts not found');
  }

  console.log('\n✅ Use case generation complete!');
}
