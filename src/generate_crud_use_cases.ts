import { mkdir, writeFile, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import {
  toPascalCase,
  toCamelCase,
  toKebabCase,
  toUpperSnakeCase,
  pluralize,
} from './lib/stringUtils.js';

interface CrudConfig {
  EntityName: string; // e.g. Product
  entityName: string; // e.g. product
  kebabName: string; // e.g. product
  TOKEN_BASE: string; // e.g. PRODUCT
  pluralKebab: string; // e.g. products
  pluralPascal: string; // e.g. Products
}

export async function generateCrudUseCases(
  EntityName: string,
  entityName: string,
  kebabName: string,
  srcDir: string,
): Promise<void> {
  const TOKEN_BASE = toUpperSnakeCase(entityName);
  const pluralKebab = pluralize(kebabName);
  const pluralPascal = toPascalCase(pluralKebab);

  const config: CrudConfig = {
    EntityName,
    entityName,
    kebabName,
    TOKEN_BASE,
    pluralKebab,
    pluralPascal,
  };

  const useCaseBaseDir = resolve(srcDir, 'use-case', kebabName);
  await mkdir(useCaseBaseDir, { recursive: true });

  // Generate each CRUD use case
  await generateCreateUseCase(useCaseBaseDir, config);
  await generateUpdateUseCase(useCaseBaseDir, config);
  await generateGetUseCase(useCaseBaseDir, config);
  await generateListUseCase(useCaseBaseDir, config);
  await generateDeleteUseCase(useCaseBaseDir, config);

  // Generate aggregator module
  await generateUseCaseAggregatorModule(useCaseBaseDir, config);

  // Auto-register in UseCaseModule.ts and main.routes.ts
  await registerInUseCaseModule(srcDir, config);
  await registerRoutes(srcDir, config);

  console.log(`\n✅ CRUD use cases generated for ${EntityName}!`);
}

// ============ CREATE USE CASE ============
async function generateCreateUseCase(
  baseDir: string,
  config: CrudConfig,
): Promise<void> {
  const { EntityName, entityName, kebabName, TOKEN_BASE } = config;
  const useCaseName = `Create${EntityName}`;
  const useCaseDir = join(baseDir, `create-${kebabName}`);
  const inputsDir = join(useCaseDir, 'inputs');
  const outputsDir = join(useCaseDir, 'outputs');

  await mkdir(useCaseDir, { recursive: true });
  await mkdir(inputsDir, { recursive: true });
  await mkdir(outputsDir, { recursive: true });

  // Input
  const inputContent = `import type { ${EntityName}Interface } from '@root/core/${kebabName}/baseZod${EntityName}Schema';

export type ${useCaseName}Input = Omit<${EntityName}Interface, 'id' | 'createdAt' | 'updatedAt' | 'deleted' | 'deletedAt'>;
`;

  // Success Output
  const successContent = `import { SuccessfullOperation } from '@root/lib';
import type { ${EntityName}Interface } from '@root/core/${kebabName}/baseZod${EntityName}Schema';

export type ${useCaseName}Payload = ${EntityName}Interface;

export class ${useCaseName}Success extends SuccessfullOperation {
  constructor(
    result: ${useCaseName}Payload,
    message: string = '${EntityName} created successfully',
  ) {
    super(message);
    this.result = result;
  }
}
`;

  // Failure Output
  const failureContent = `import { FailedOperation } from '@root/lib';

export class ${useCaseName}Failure extends FailedOperation {
  constructor(message: string = 'Failed to create ${EntityName}') {
    super(message);
  }
}
`;

  // Use Case
  const useCaseContent = `import { Inject, Module, Service } from '@kanian77/simple-di';
import { ${useCaseName}Success, type ${useCaseName}Payload } from './outputs/${useCaseName}Success';
import type { IUseCase } from '../../IUseCase';
import type { ${useCaseName}Input } from './inputs/${useCaseName}Input';
import { ${EntityName}Module } from '@root/core/${kebabName}/${EntityName}Module';
import { ${TOKEN_BASE}_SERVICE_INTERFACE, type I${EntityName}Service } from '@root/core/${kebabName}/I${EntityName}Service';

export const ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN = '${toUpperSnakeCase(useCaseName)}_USE_CASE';

@Service({
  token: ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN,
  lifecycle: 'transient',
})
export class ${useCaseName} implements IUseCase {
  constructor(
    @Inject(${TOKEN_BASE}_SERVICE_INTERFACE)
    private readonly ${entityName}Service: I${EntityName}Service,
  ) {}

  async execute(input: ${useCaseName}Input): Promise<${useCaseName}Success> {
    const created = await this.${entityName}Service.create(input);
    return new ${useCaseName}Success(created as ${useCaseName}Payload);
  }
}

export const ${useCaseName}Module = new Module({
  imports: [${EntityName}Module],
  providers: [
    {
      provide: ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN,
      useClass: ${useCaseName},
    },
  ],
});
`;

  // Routes
  const routesContent = `import { Hono } from 'hono';
import { StatusCodes } from 'http-status-codes';
import { inject } from '@kanian77/simple-di';
import { ${useCaseName}, ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN } from './${useCaseName}';
import { ${useCaseName}Failure } from './outputs/${useCaseName}Failure';
import type { ${useCaseName}Input } from './inputs/${useCaseName}Input';

const ${toCamelCase(useCaseName)}Routes = new Hono();

${toCamelCase(useCaseName)}Routes.post('/', async (c) => {
  try {
    const input = await c.req.json<${useCaseName}Input>();
    const useCase = inject<${useCaseName}>(${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN);
    const result = await useCase.execute(input);
    return c.json(result, StatusCodes.CREATED);
  } catch (e) {
    console.error('Error in ${toCamelCase(useCaseName)}Routes:', e);
    return c.json(
      new ${useCaseName}Failure('Internal Server Error'),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
});

const ${toCamelCase(useCaseName)}RoutesPath = '/';

export { ${toCamelCase(useCaseName)}Routes, ${toCamelCase(useCaseName)}RoutesPath };
`;

  await writeFile(join(inputsDir, `${useCaseName}Input.ts`), inputContent);
  await writeFile(join(outputsDir, `${useCaseName}Success.ts`), successContent);
  await writeFile(join(outputsDir, `${useCaseName}Failure.ts`), failureContent);
  await writeFile(join(useCaseDir, `${useCaseName}.ts`), useCaseContent);
  await writeFile(
    join(useCaseDir, `${toCamelCase(useCaseName)}Routes.ts`),
    routesContent,
  );
  console.log(`Created: create-${kebabName}/ use case`);
}

// ============ UPDATE USE CASE ============
async function generateUpdateUseCase(
  baseDir: string,
  config: CrudConfig,
): Promise<void> {
  const { EntityName, entityName, kebabName, TOKEN_BASE } = config;
  const useCaseName = `Update${EntityName}`;
  const useCaseDir = join(baseDir, `update-${kebabName}`);
  const inputsDir = join(useCaseDir, 'inputs');
  const outputsDir = join(useCaseDir, 'outputs');

  await mkdir(useCaseDir, { recursive: true });
  await mkdir(inputsDir, { recursive: true });
  await mkdir(outputsDir, { recursive: true });

  // Input
  const inputContent = `import type { ${EntityName}Interface } from '@root/core/${kebabName}/baseZod${EntityName}Schema';

export interface ${useCaseName}Input {
  id: string;
  data: Partial<Omit<${EntityName}Interface, 'id' | 'createdAt' | 'updatedAt'>>;
}
`;

  // Success Output
  const successContent = `import { SuccessfullOperation } from '@root/lib';
import type { ${EntityName}Interface } from '@root/core/${kebabName}/baseZod${EntityName}Schema';

export type ${useCaseName}Payload = ${EntityName}Interface;

export class ${useCaseName}Success extends SuccessfullOperation {
  constructor(
    result: ${useCaseName}Payload,
    message: string = '${EntityName} updated successfully',
  ) {
    super(message);
    this.result = result;
  }
}
`;

  // Failure Output
  const failureContent = `import { FailedOperation } from '@root/lib';

export class ${useCaseName}Failure extends FailedOperation {
  constructor(message: string = 'Failed to update ${EntityName}') {
    super(message);
  }
}
`;

  // Use Case
  const useCaseContent = `import { Inject, Module, Service } from '@kanian77/simple-di';
import { ${useCaseName}Success, type ${useCaseName}Payload } from './outputs/${useCaseName}Success';
import type { IUseCase } from '../../IUseCase';
import type { ${useCaseName}Input } from './inputs/${useCaseName}Input';
import { ${EntityName}Module } from '@root/core/${kebabName}/${EntityName}Module';
import { ${TOKEN_BASE}_SERVICE_INTERFACE, type I${EntityName}Service } from '@root/core/${kebabName}/I${EntityName}Service';

export const ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN = '${toUpperSnakeCase(useCaseName)}_USE_CASE';

@Service({
  token: ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN,
  lifecycle: 'transient',
})
export class ${useCaseName} implements IUseCase {
  constructor(
    @Inject(${TOKEN_BASE}_SERVICE_INTERFACE)
    private readonly ${entityName}Service: I${EntityName}Service,
  ) {}

  async execute(input: ${useCaseName}Input): Promise<${useCaseName}Success> {
    const updated = await this.${entityName}Service.update(input.id, input.data);
    return new ${useCaseName}Success(updated as ${useCaseName}Payload);
  }
}

export const ${useCaseName}Module = new Module({
  imports: [${EntityName}Module],
  providers: [
    {
      provide: ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN,
      useClass: ${useCaseName},
    },
  ],
});
`;

  // Routes
  const routesContent = `import { Hono } from 'hono';
import { StatusCodes } from 'http-status-codes';
import { inject } from '@kanian77/simple-di';
import { ${useCaseName}, ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN } from './${useCaseName}';
import { ${useCaseName}Failure } from './outputs/${useCaseName}Failure';
import type { ${useCaseName}Input } from './inputs/${useCaseName}Input';

const ${toCamelCase(useCaseName)}Routes = new Hono();

${toCamelCase(useCaseName)}Routes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    const input: ${useCaseName}Input = { id, data };
    const useCase = inject<${useCaseName}>(${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN);
    const result = await useCase.execute(input);
    return c.json(result, StatusCodes.OK);
  } catch (e) {
    console.error('Error in ${toCamelCase(useCaseName)}Routes:', e);
    return c.json(
      new ${useCaseName}Failure('Internal Server Error'),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
});

const ${toCamelCase(useCaseName)}RoutesPath = '/';

export { ${toCamelCase(useCaseName)}Routes, ${toCamelCase(useCaseName)}RoutesPath };
`;

  await writeFile(join(inputsDir, `${useCaseName}Input.ts`), inputContent);
  await writeFile(join(outputsDir, `${useCaseName}Success.ts`), successContent);
  await writeFile(join(outputsDir, `${useCaseName}Failure.ts`), failureContent);
  await writeFile(join(useCaseDir, `${useCaseName}.ts`), useCaseContent);
  await writeFile(
    join(useCaseDir, `${toCamelCase(useCaseName)}Routes.ts`),
    routesContent,
  );
  console.log(`Created: update-${kebabName}/ use case`);
}

// ============ GET USE CASE ============
async function generateGetUseCase(
  baseDir: string,
  config: CrudConfig,
): Promise<void> {
  const { EntityName, entityName, kebabName, TOKEN_BASE } = config;
  const useCaseName = `Get${EntityName}`;
  const useCaseDir = join(baseDir, `get-${kebabName}`);
  const outputsDir = join(useCaseDir, 'outputs');

  await mkdir(useCaseDir, { recursive: true });
  await mkdir(outputsDir, { recursive: true });

  // Success Output
  const successContent = `import { SuccessfullOperation } from '@root/lib';
import type { ${EntityName}Interface } from '@root/core/${kebabName}/baseZod${EntityName}Schema';

export type ${useCaseName}Payload = ${EntityName}Interface;

export class ${useCaseName}Success extends SuccessfullOperation {
  constructor(
    result: ${useCaseName}Payload,
    message: string = '${EntityName} retrieved successfully',
  ) {
    super(message);
    this.result = result;
  }
}
`;

  // Failure Output
  const failureContent = `import { FailedOperation } from '@root/lib';

export class ${useCaseName}Failure extends FailedOperation {
  constructor(message: string = 'Failed to get ${EntityName}') {
    super(message);
  }
}
`;

  // Use Case
  const useCaseContent = `import { Inject, Module, Service } from '@kanian77/simple-di';
import { ${useCaseName}Success, type ${useCaseName}Payload } from './outputs/${useCaseName}Success';
import type { IUseCase } from '../../IUseCase';
import { ${EntityName}Module } from '@root/core/${kebabName}/${EntityName}Module';
import { ${TOKEN_BASE}_SERVICE_INTERFACE, type I${EntityName}Service } from '@root/core/${kebabName}/I${EntityName}Service';

export const ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN = '${toUpperSnakeCase(useCaseName)}_USE_CASE';

@Service({
  token: ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN,
  lifecycle: 'transient',
})
export class ${useCaseName} implements IUseCase {
  constructor(
    @Inject(${TOKEN_BASE}_SERVICE_INTERFACE)
    private readonly ${entityName}Service: I${EntityName}Service,
  ) {}

  async execute(id: string): Promise<${useCaseName}Success> {
    const entity = await this.${entityName}Service.findById(id);
    return new ${useCaseName}Success(entity as ${useCaseName}Payload);
  }
}

export const ${useCaseName}Module = new Module({
  imports: [${EntityName}Module],
  providers: [
    {
      provide: ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN,
      useClass: ${useCaseName},
    },
  ],
});
`;

  // Routes
  const routesContent = `import { Hono } from 'hono';
import { StatusCodes } from 'http-status-codes';
import { inject } from '@kanian77/simple-di';
import { ${useCaseName}, ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN } from './${useCaseName}';
import { ${useCaseName}Failure } from './outputs/${useCaseName}Failure';

const ${toCamelCase(useCaseName)}Routes = new Hono();

${toCamelCase(useCaseName)}Routes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const useCase = inject<${useCaseName}>(${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN);
    const result = await useCase.execute(id);
    return c.json(result, StatusCodes.OK);
  } catch (e) {
    console.error('Error in ${toCamelCase(useCaseName)}Routes:', e);
    return c.json(
      new ${useCaseName}Failure('Internal Server Error'),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
});

const ${toCamelCase(useCaseName)}RoutesPath = '/';

export { ${toCamelCase(useCaseName)}Routes, ${toCamelCase(useCaseName)}RoutesPath };
`;

  await writeFile(join(outputsDir, `${useCaseName}Success.ts`), successContent);
  await writeFile(join(outputsDir, `${useCaseName}Failure.ts`), failureContent);
  await writeFile(join(useCaseDir, `${useCaseName}.ts`), useCaseContent);
  await writeFile(
    join(useCaseDir, `${toCamelCase(useCaseName)}Routes.ts`),
    routesContent,
  );
  console.log(`Created: get-${kebabName}/ use case`);
}

// ============ LIST USE CASE ============
async function generateListUseCase(
  baseDir: string,
  config: CrudConfig,
): Promise<void> {
  const { EntityName, entityName, kebabName, TOKEN_BASE, pluralPascal } =
    config;
  const useCaseName = `List${pluralPascal}`;
  const useCaseDir = join(baseDir, `list-${config.pluralKebab}`);
  const outputsDir = join(useCaseDir, 'outputs');

  await mkdir(useCaseDir, { recursive: true });
  await mkdir(outputsDir, { recursive: true });

  // Success Output
  const successContent = `import { SuccessfullOperation } from '@root/lib';
import type { ${EntityName}Interface } from '@root/core/${kebabName}/baseZod${EntityName}Schema';

export type ${useCaseName}Payload = ${EntityName}Interface[];

export class ${useCaseName}Success extends SuccessfullOperation {
  constructor(
    result: ${useCaseName}Payload,
    message: string = '${pluralPascal} retrieved successfully',
  ) {
    super(message);
    this.result = result;
  }
}
`;

  // Failure Output
  const failureContent = `import { FailedOperation } from '@root/lib';

export class ${useCaseName}Failure extends FailedOperation {
  constructor(message: string = 'Failed to list ${pluralPascal}') {
    super(message);
  }
}
`;

  // Use Case
  const useCaseContent = `import { Inject, Module, Service } from '@kanian77/simple-di';
import { ${useCaseName}Success, type ${useCaseName}Payload } from './outputs/${useCaseName}Success';
import type { IUseCase } from '../../IUseCase';
import { ${EntityName}Module } from '@root/core/${kebabName}/${EntityName}Module';
import { ${TOKEN_BASE}_SERVICE_INTERFACE, type I${EntityName}Service } from '@root/core/${kebabName}/I${EntityName}Service';

export const ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN = '${toUpperSnakeCase(useCaseName)}_USE_CASE';

@Service({
  token: ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN,
  lifecycle: 'transient',
})
export class ${useCaseName} implements IUseCase {
  constructor(
    @Inject(${TOKEN_BASE}_SERVICE_INTERFACE)
    private readonly ${entityName}Service: I${EntityName}Service,
  ) {}

  async execute(): Promise<${useCaseName}Success> {
    const entities = await this.${entityName}Service.findAll();
    return new ${useCaseName}Success(entities as ${useCaseName}Payload);
  }
}

export const ${useCaseName}Module = new Module({
  imports: [${EntityName}Module],
  providers: [
    {
      provide: ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN,
      useClass: ${useCaseName},
    },
  ],
});
`;

  // Routes
  const routesContent = `import { Hono } from 'hono';
import { StatusCodes } from 'http-status-codes';
import { inject } from '@kanian77/simple-di';
import { ${useCaseName}, ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN } from './${useCaseName}';
import { ${useCaseName}Failure } from './outputs/${useCaseName}Failure';

const ${toCamelCase(useCaseName)}Routes = new Hono();

${toCamelCase(useCaseName)}Routes.get('/', async (c) => {
  try {
    const useCase = inject<${useCaseName}>(${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN);
    const result = await useCase.execute();
    return c.json(result, StatusCodes.OK);
  } catch (e) {
    console.error('Error in ${toCamelCase(useCaseName)}Routes:', e);
    return c.json(
      new ${useCaseName}Failure('Internal Server Error'),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
});

const ${toCamelCase(useCaseName)}RoutesPath = '/';

export { ${toCamelCase(useCaseName)}Routes, ${toCamelCase(useCaseName)}RoutesPath };
`;

  await writeFile(join(outputsDir, `${useCaseName}Success.ts`), successContent);
  await writeFile(join(outputsDir, `${useCaseName}Failure.ts`), failureContent);
  await writeFile(join(useCaseDir, `${useCaseName}.ts`), useCaseContent);
  await writeFile(
    join(useCaseDir, `${toCamelCase(useCaseName)}Routes.ts`),
    routesContent,
  );
  console.log(`Created: list-${config.pluralKebab}/ use case`);
}

// ============ DELETE USE CASE ============
async function generateDeleteUseCase(
  baseDir: string,
  config: CrudConfig,
): Promise<void> {
  const { EntityName, entityName, kebabName, TOKEN_BASE } = config;
  const useCaseName = `Delete${EntityName}`;
  const useCaseDir = join(baseDir, `delete-${kebabName}`);
  const outputsDir = join(useCaseDir, 'outputs');

  await mkdir(useCaseDir, { recursive: true });
  await mkdir(outputsDir, { recursive: true });

  // Success Output
  const successContent = `import { SuccessfullOperation } from '@root/lib';

export type ${useCaseName}Payload = { id: string; deleted: boolean };

export class ${useCaseName}Success extends SuccessfullOperation {
  constructor(
    result: ${useCaseName}Payload,
    message: string = '${EntityName} deleted successfully',
  ) {
    super(message);
    this.result = result;
  }
}
`;

  // Failure Output
  const failureContent = `import { FailedOperation } from '@root/lib';

export class ${useCaseName}Failure extends FailedOperation {
  constructor(message: string = 'Failed to delete ${EntityName}') {
    super(message);
  }
}
`;

  // Use Case
  const useCaseContent = `import { Inject, Module, Service } from '@kanian77/simple-di';
import { ${useCaseName}Success, type ${useCaseName}Payload } from './outputs/${useCaseName}Success';
import type { IUseCase } from '../../IUseCase';
import { ${EntityName}Module } from '@root/core/${kebabName}/${EntityName}Module';
import { ${TOKEN_BASE}_SERVICE_INTERFACE, type I${EntityName}Service } from '@root/core/${kebabName}/I${EntityName}Service';

export const ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN = '${toUpperSnakeCase(useCaseName)}_USE_CASE';

@Service({
  token: ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN,
  lifecycle: 'transient',
})
export class ${useCaseName} implements IUseCase {
  constructor(
    @Inject(${TOKEN_BASE}_SERVICE_INTERFACE)
    private readonly ${entityName}Service: I${EntityName}Service,
  ) {}

  async execute(id: string): Promise<${useCaseName}Success> {
    await this.${entityName}Service.delete(id);
    const result: ${useCaseName}Payload = { id, deleted: true };
    return new ${useCaseName}Success(result);
  }
}

export const ${useCaseName}Module = new Module({
  imports: [${EntityName}Module],
  providers: [
    {
      provide: ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN,
      useClass: ${useCaseName},
    },
  ],
});
`;

  // Routes
  const routesContent = `import { Hono } from 'hono';
import { StatusCodes } from 'http-status-codes';
import { inject } from '@kanian77/simple-di';
import { ${useCaseName}, ${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN } from './${useCaseName}';
import { ${useCaseName}Failure } from './outputs/${useCaseName}Failure';

const ${toCamelCase(useCaseName)}Routes = new Hono();

${toCamelCase(useCaseName)}Routes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const useCase = inject<${useCaseName}>(${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN);
    const result = await useCase.execute(id);
    return c.json(result, StatusCodes.OK);
  } catch (e) {
    console.error('Error in ${toCamelCase(useCaseName)}Routes:', e);
    return c.json(
      new ${useCaseName}Failure('Internal Server Error'),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
});

const ${toCamelCase(useCaseName)}RoutesPath = '/';

export { ${toCamelCase(useCaseName)}Routes, ${toCamelCase(useCaseName)}RoutesPath };
`;

  await writeFile(join(outputsDir, `${useCaseName}Success.ts`), successContent);
  await writeFile(join(outputsDir, `${useCaseName}Failure.ts`), failureContent);
  await writeFile(join(useCaseDir, `${useCaseName}.ts`), useCaseContent);
  await writeFile(
    join(useCaseDir, `${toCamelCase(useCaseName)}Routes.ts`),
    routesContent,
  );
  console.log(`Created: delete-${kebabName}/ use case`);
}

// ============ AGGREGATOR MODULE ============
async function generateUseCaseAggregatorModule(
  baseDir: string,
  config: CrudConfig,
): Promise<void> {
  const { EntityName, kebabName, pluralPascal, pluralKebab } = config;

  const content = `import { Module } from '@kanian77/simple-di';
import { Create${EntityName}Module } from './create-${kebabName}/Create${EntityName}';
import { Update${EntityName}Module } from './update-${kebabName}/Update${EntityName}';
import { Get${EntityName}Module } from './get-${kebabName}/Get${EntityName}';
import { List${pluralPascal}Module } from './list-${pluralKebab}/List${pluralPascal}';
import { Delete${EntityName}Module } from './delete-${kebabName}/Delete${EntityName}';

export const ${EntityName}UseCaseModule = new Module({
  imports: [
    Create${EntityName}Module,
    Update${EntityName}Module,
    Get${EntityName}Module,
    List${pluralPascal}Module,
    Delete${EntityName}Module,
  ],
});
`;

  await writeFile(join(baseDir, `${EntityName}UseCaseModule.ts`), content);
  console.log(`Created: ${kebabName}/${EntityName}UseCaseModule.ts`);
}

// ============ REGISTER IN UseCaseModule.ts ============
async function registerInUseCaseModule(
  srcDir: string,
  config: CrudConfig,
): Promise<void> {
  const { EntityName, kebabName } = config;
  const useCaseModulePath = join(srcDir, 'use-case', 'UseCaseModule.ts');

  if (!existsSync(useCaseModulePath)) {
    console.warn('Warning: src/use-case/UseCaseModule.ts not found');
    return;
  }

  let content = await readFile(useCaseModulePath, 'utf8');
  const importStatement = `import { ${EntityName}UseCaseModule } from './${kebabName}/${EntityName}UseCaseModule';`;

  if (content.includes(`${EntityName}UseCaseModule`)) {
    return; // Already registered
  }

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
      if (!arrayContent.includes(`${EntityName}UseCaseModule`)) {
        const trimmed = arrayContent.trim();
        const hasTrailingComma = trimmed.endsWith(',');
        const separator = trimmed.length > 0 && !hasTrailingComma ? ', ' : '';
        const insertion = `${separator}${EntityName}UseCaseModule`;
        content =
          content.slice(0, endIndex) + insertion + content.slice(endIndex);
      }
    }
  }

  await writeFile(useCaseModulePath, content);
  console.log(`Updated: src/use-case/UseCaseModule.ts`);
}

// ============ REGISTER ROUTES ============
async function registerRoutes(
  srcDir: string,
  config: CrudConfig,
): Promise<void> {
  const { EntityName, entityName, kebabName, pluralPascal, pluralKebab } =
    config;
  const mainRoutesPath = join(srcDir, 'main.routes.ts');

  if (!existsSync(mainRoutesPath)) {
    console.warn('Warning: src/main.routes.ts not found');
    return;
  }

  let content = await readFile(mainRoutesPath, 'utf8');

  // Import all route handlers
  const routeImports = `import { create${EntityName}Routes } from './use-case/${kebabName}/create-${kebabName}/create${EntityName}Routes';
import { update${EntityName}Routes } from './use-case/${kebabName}/update-${kebabName}/update${EntityName}Routes';
import { get${EntityName}Routes } from './use-case/${kebabName}/get-${kebabName}/get${EntityName}Routes';
import { list${pluralPascal}Routes } from './use-case/${kebabName}/list-${pluralKebab}/list${pluralPascal}Routes';
import { delete${EntityName}Routes } from './use-case/${kebabName}/delete-${kebabName}/delete${EntityName}Routes';`;

  if (content.includes(`create${EntityName}Routes`)) {
    return; // Already registered
  }

  // Add imports after last import
  const lastImportIndex = content.lastIndexOf('import ');
  if (lastImportIndex !== -1) {
    let searchPos = lastImportIndex;
    while (searchPos < content.length) {
      if (content[searchPos] === ';') {
        content =
          content.slice(0, searchPos + 1) +
          '\n' +
          routeImports +
          content.slice(searchPos + 1);
        break;
      }
      searchPos++;
    }
  }

  // Add route registrations before export
  const routeRegistrations = `
// ${EntityName} CRUD routes
const ${entityName}Routes = new Hono();
${entityName}Routes.route('/', create${EntityName}Routes);
${entityName}Routes.route('/', update${EntityName}Routes);
${entityName}Routes.route('/', get${EntityName}Routes);
${entityName}Routes.route('/', list${pluralPascal}Routes);
${entityName}Routes.route('/', delete${EntityName}Routes);
mainRoutes.route('/${pluralKebab}', ${entityName}Routes);
`;

  const exportIndex = content.indexOf('export { mainRoutes }');
  if (exportIndex !== -1) {
    content =
      content.slice(0, exportIndex) +
      routeRegistrations +
      '\n' +
      content.slice(exportIndex);
  }

  // Check if Hono is imported
  if (
    !content.includes('import { Hono }') &&
    !content.includes('import {Hono}')
  ) {
    // Add Hono import at top if not present
    content = "import { Hono } from 'hono';\n" + content;
  }

  await writeFile(mainRoutesPath, content);
  console.log(`Updated: src/main.routes.ts with ${EntityName} CRUD routes`);
}
