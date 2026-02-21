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

export const ${entityName}Routes = new Hono();
export const ${entityName}RoutesPath = '/${kebabName}';

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

export { ${entityName}Routes as Route, ${entityName}RoutesPath as Path };
`;

  // 5. <EntityName>.e2e.spec.ts (Stub E2E Test)
  const importDefs = imports.map((imp) => {
    const pascal = toPascalCase(imp);
    const camel = toCamelCase(imp);
    const kebab = toKebabCase(imp);
    const upper = toUpperSnakeCase(imp);
    return { pascal, camel, kebab, upper };
  });

  const coreModuleImports = importDefs
    .map(
      (d) =>
        `import { ${d.pascal}Module } from '@root/core/${d.kebab}/${d.pascal}Module';`,
    )
    .join('\n');

  const repoTypeImports = importDefs
    .map(
      (d) =>
        `import type { ${d.pascal}Repository } from '@root/core/${d.kebab}/${d.pascal}Repository';\nimport { ${d.upper}_REPOSITORY_INTERFACE } from '@root/core/${d.kebab}/I${d.pascal}Repository';`,
    )
    .join('\n');

  const letDeclarations = importDefs
    .map((d) => `  let ${d.camel}Repository: ${d.pascal}Repository;`)
    .join('\n');

  // Deletes in reverse order (dependencies last)
  const schemaDeletes = [...importDefs]
    .reverse()
    .map((d) => `    await db.delete(schema.${d.camel}Schema).execute();`)
    .join('\n');

  const bootstrapModules = [
    ...importDefs.map((d) => `          ${d.pascal}Module`),
    `          ${EntityName}Module`,
  ].join(',\n');

  const injectCalls = importDefs
    .map(
      (d) =>
        `    ${d.camel}Repository = inject(${d.upper}_REPOSITORY_INTERFACE);`,
    )
    .join('\n');

  const smokeAssertions = importDefs
    .map((d) => `    expect(${d.camel}Repository).toBeDefined();`)
    .join('\n');

  const specContent = `import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { inject, bootstrap, Module } from '@kanian77/simple-di';
import { getDb } from 'db/getDb';
import * as schema from '@root/schema';
${coreModuleImports}
import { getDbModule } from 'db/getDbModule';
import { getConfigModule } from 'config/getConfigModule';
import { EnvFileNames } from '@root/lib';
import { ${EntityName}Module } from './${EntityName}';
${repoTypeImports}

describe('${EntityName} Use Case', () => {
${letDeclarations}

  const clear = async (db: ReturnType<typeof getDb>) => {
${schemaDeletes}
  };

  beforeAll(async () => {
    bootstrap(
      new Module({
        imports: [
          getConfigModule(EnvFileNames.TESTING),
          getDbModule(EnvFileNames.TESTING),
${bootstrapModules},
        ],
      }),
    );
${injectCalls}
  });

  afterEach(async () => {
    await clear(getDb());
  });

  afterAll(async () => {
    await clear(getDb());
  });

  test('repos are defined', async () => {
${smokeAssertions}
  });
});
`;

  // Write files
  const files: { path: string; content: string }[] = [
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

  if (imports.length > 0) {
    files.push({
      path: join(targetDir, `${EntityName}.e2e.spec.ts`),
      content: specContent,
    });
  }

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

  console.log('\n✅ Use case generation complete!');
}
