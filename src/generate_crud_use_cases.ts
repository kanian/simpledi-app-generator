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

  // Auto-register in UseCaseModule.ts
  await registerInUseCaseModule(srcDir, config);

  // Phase 3: Generate Scaffolded E2E Tests
  await generateCreateE2ETest(useCaseBaseDir, config);
  await generateUpdateE2ETest(useCaseBaseDir, config);
  await generateGetE2ETest(useCaseBaseDir, config);
  await generateListE2ETest(useCaseBaseDir, config);
  await generateDeleteE2ETest(useCaseBaseDir, config);

  console.log(`\n✅ CRUD use cases generated for ${EntityName}!`);
}

// ============ CREATE USE CASE ============
async function generateCreateUseCase(
  baseDir: string,
  config: CrudConfig,
): Promise<void> {
  const { EntityName, entityName, kebabName, TOKEN_BASE, pluralKebab } = config;
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
import { ${EntityName}InsertSchema } from '@root/core/${kebabName}/${EntityName}';
import { getContextUser } from '@root/lib/functions/getContextUser';
import { authGuard } from '@root/middlewares/authGuard';
import { roleGuard } from '@root/middlewares/roleGuard';
import { AdminRoleEnum } from '@root/lib';

export const ${toCamelCase(useCaseName)}Routes = new Hono();
export const ${toCamelCase(useCaseName)}RoutesPath = '/${pluralKebab}';

${toCamelCase(useCaseName)}Routes.post(
  '/',
  authGuard(),
  roleGuard([AdminRoleEnum.ADMIN]),
  async (c) => {
    try {
      const rawInput = await c.req.json();
      const user = getContextUser(c);
      if (user) {
        rawInput.createdBy = user.id;
      }

      const input = ${EntityName}InsertSchema.parse(rawInput);
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
  }
);

export { ${toCamelCase(useCaseName)}Routes as Route, ${toCamelCase(useCaseName)}RoutesPath as Path };
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
  const { EntityName, entityName, kebabName, TOKEN_BASE, pluralKebab } = config;
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
import { ${EntityName}UpdateSchema } from '@root/core/${kebabName}/${EntityName}';
import { getContextUser } from '@root/lib/functions/getContextUser';
import { authGuard } from '@root/middlewares/authGuard';
import { roleGuard } from '@root/middlewares/roleGuard';
import { AdminRoleEnum } from '@root/lib';

export const ${toCamelCase(useCaseName)}Routes = new Hono();
export const ${toCamelCase(useCaseName)}RoutesPath = '/${pluralKebab}/:id';

${toCamelCase(useCaseName)}Routes.put(
  '/',
  authGuard(),
  roleGuard([AdminRoleEnum.ADMIN]),
  async (c) => {
    try {
      const id = c.req.param('id');
      const rawBody = await c.req.json();

      const user = getContextUser(c);
      if (user) {
        rawBody.updatedBy = user.id;
      }

      const data = ${EntityName}UpdateSchema.parse(rawBody);
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
  }
);

export { ${toCamelCase(useCaseName)}Routes as Route, ${toCamelCase(useCaseName)}RoutesPath as Path };
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
  const { EntityName, entityName, kebabName, TOKEN_BASE, pluralKebab } = config;
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

export const ${toCamelCase(useCaseName)}Routes = new Hono();
export const ${toCamelCase(useCaseName)}RoutesPath = '/${pluralKebab}/:id';

${toCamelCase(useCaseName)}Routes.get('/', async (c) => {
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

export { ${toCamelCase(useCaseName)}Routes as Route, ${toCamelCase(useCaseName)}RoutesPath as Path };
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
  const {
    EntityName,
    entityName,
    kebabName,
    TOKEN_BASE,
    pluralPascal,
    pluralKebab,
  } = config;
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

export const ${toCamelCase(useCaseName)}Routes = new Hono();
export const ${toCamelCase(useCaseName)}RoutesPath = '/${pluralKebab}';

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

export { ${toCamelCase(useCaseName)}Routes as Route, ${toCamelCase(useCaseName)}RoutesPath as Path };
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
  const { EntityName, entityName, kebabName, TOKEN_BASE, pluralKebab } = config;
  const useCaseName = `Delete${EntityName}`;
  const useCaseDir = join(baseDir, `delete-${kebabName}`);
  const outputsDir = join(useCaseDir, 'outputs');

  await mkdir(useCaseDir, { recursive: true });
  await mkdir(outputsDir, { recursive: true });

  // Success Output
  const successContent = `import { SuccessfullOperation } from '@root/lib';

export type ${useCaseName}Payload = { id: string; deleted: boolean; softDelete: boolean };

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

  async execute(id: string, softDelete: boolean = true): Promise<${useCaseName}Success> {
    await this.${entityName}Service.delete(id, softDelete);
    const result: ${useCaseName}Payload = { id, deleted: true, softDelete };
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
import { authGuard } from '@root/middlewares/authGuard';
import { roleGuard } from '@root/middlewares/roleGuard';
import { AdminRoleEnum } from '@root/lib';

export const ${toCamelCase(useCaseName)}Routes = new Hono();
export const ${toCamelCase(useCaseName)}RoutesPath = '/${pluralKebab}/:id';

${toCamelCase(useCaseName)}Routes.delete(
  '/',
  authGuard(),
  roleGuard([AdminRoleEnum.ADMIN]),
  async (c) => {
    try {
      const id = c.req.param('id');

      let softDelete = true;
      try {
        const body = await c.req.json();
        if (typeof body.softDelete === 'boolean') {
          softDelete = body.softDelete;
        }
      } catch (e) {
        // Body is likely empty, default to softDelete = true
      }

      const useCase = inject<${useCaseName}>(${toUpperSnakeCase(useCaseName)}_USE_CASE_TOKEN);
      const result = await useCase.execute(id, softDelete);
      return c.json(result, StatusCodes.OK);
    } catch (e) {
      console.error('Error in ${toCamelCase(useCaseName)}Routes:', e);
      return c.json(
        new ${useCaseName}Failure('Internal Server Error'),
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
);

export { ${toCamelCase(useCaseName)}Routes as Route, ${toCamelCase(useCaseName)}RoutesPath as Path };
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

// ============ E2E TESTS GENERATION ============

async function generateCreateE2ETest(
  baseDir: string,
  config: CrudConfig,
): Promise<void> {
  const { EntityName, entityName, kebabName, TOKEN_BASE, pluralKebab } = config;
  const useCaseDir = join(baseDir, `create-${kebabName}`);
  const testContent = `import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { inject, bootstrap, Module } from '@kanian77/simple-di';
import { getDb } from 'db/getDb';
import * as schema from '@root/schema';
import {
  createOneSignedUpUser,
  deleteCreatedSignedUsers,
} from '@root/lib/functions/test-related/createSignedUpUser';
import {
  create${EntityName}Routes,
  create${EntityName}RoutesPath,
} from './create${EntityName}Routes';
import { ${EntityName}Module } from '@root/core/${kebabName}/${EntityName}Module';
import { UserModule } from '@root/core/user/UserModule';
import { Create${EntityName}Module } from './Create${EntityName}';
import { getDbModule } from 'db/getDbModule';
import { getConfigModule } from 'config/getConfigModule';
import { EnvFileNames } from '@root/lib';
import { StatusCodes } from 'http-status-codes';
import { getNewTestServer } from '@root/lib/functions/test-related/getNewTestServer';
import { USER_REPOSITORY_INTERFACE } from '@root/core/user/IUserRepository';
import type { UserRepository } from '@root/core/user/UserRepository';
import { AdminRoleEnum } from '@root/lib/types/AdminRoleEnum';
import { UserTypeEnum } from '@root/lib/types/UserTypeEnum';
import { ${EntityName}Repository } from '@root/core/${kebabName}/${EntityName}Repository';
import { ${TOKEN_BASE}_REPOSITORY_INTERFACE } from '@root/core/${kebabName}/I${EntityName}Repository';
import { randomUUID } from 'crypto';

describe('Create${EntityName} Use Case', () => {
  let userRepository: UserRepository;
  let ${entityName}Repository: ${EntityName}Repository;

  const clear = async (db: ReturnType<typeof getDb>) => {
    await db.delete(schema.${entityName}Schema).execute();
    await db.delete(schema.userSchema).execute();
  };

  beforeAll(async () => {
    bootstrap(
      new Module({
        imports: [
          getConfigModule(EnvFileNames.TESTING),
          getDbModule(EnvFileNames.TESTING),
          UserModule,
          ${EntityName}Module,
          Create${EntityName}Module,
        ],
      }),
    );
    userRepository = inject(USER_REPOSITORY_INTERFACE);
    ${entityName}Repository = inject(${TOKEN_BASE}_REPOSITORY_INTERFACE);
  });

  afterEach(async () => {
    await getDb().delete(schema.${entityName}Schema).execute();
    await deleteCreatedSignedUsers(userRepository);
  });

  afterAll(async () => {
    await clear(getDb());
  });

  it('should create an entity successfully', async () => {
    const { user, token } = await createOneSignedUpUser(userRepository, {
      userType: UserTypeEnum.ADMIN,
      role: AdminRoleEnum.ADMIN,
    });

    const server = getNewTestServer({
      [create${EntityName}RoutesPath]: {
        handler: create${EntityName}Routes,
      },
    });

    const payload = { name: 'Test ${EntityName}' };
    const response = await server
      .request()
      .post(create${EntityName}RoutesPath)
      .set('Authorization', \`Bearer \${token}\`)
      .send(payload);

    expect(response.status).toBe(StatusCodes.CREATED);
    const body = response.body as any;
    expect(body.result).toBeDefined();
    expect(body.result.name).toBe('Test ${EntityName}');
    expect(body.result.createdBy).toBe(user.id);

    await server.close();
  });

  it('should return 401 Unauthorized without auth block', async () => {
    const server = getNewTestServer({
      [create${EntityName}RoutesPath]: {
        handler: create${EntityName}Routes,
      },
    });

    const response = await server
      .request()
      .post(create${EntityName}RoutesPath)
      .send({ name: 'Test ${EntityName}' });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);

    await server.close();
  });
});
`;
  await writeFile(
    join(useCaseDir, `Create${EntityName}.e2e.spec.ts`),
    testContent,
  );
}

async function generateUpdateE2ETest(
  baseDir: string,
  config: CrudConfig,
): Promise<void> {
  const { EntityName, entityName, kebabName, TOKEN_BASE, pluralKebab } = config;
  const useCaseDir = join(baseDir, `update-${kebabName}`);
  const testContent = `import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { inject, bootstrap, Module } from '@kanian77/simple-di';
import { getDb } from 'db/getDb';
import * as schema from '@root/schema';
import {
  createOneSignedUpUser,
  deleteCreatedSignedUsers,
} from '@root/lib/functions/test-related/createSignedUpUser';
import {
  update${EntityName}Routes,
  update${EntityName}RoutesPath,
} from './update${EntityName}Routes';
import { ${EntityName}Module } from '@root/core/${kebabName}/${EntityName}Module';
import { UserModule } from '@root/core/user/UserModule';
import { Update${EntityName}Module } from './Update${EntityName}';
import { getDbModule } from 'db/getDbModule';
import { getConfigModule } from 'config/getConfigModule';
import { EnvFileNames } from '@root/lib';
import { StatusCodes } from 'http-status-codes';
import { getNewTestServer } from '@root/lib/functions/test-related/getNewTestServer';
import { USER_REPOSITORY_INTERFACE } from '@root/core/user/IUserRepository';
import type { UserRepository } from '@root/core/user/UserRepository';
import { AdminRoleEnum } from '@root/lib/types/AdminRoleEnum';
import { UserTypeEnum } from '@root/lib/types/UserTypeEnum';
import { ${EntityName}Repository } from '@root/core/${kebabName}/${EntityName}Repository';
import { ${TOKEN_BASE}_REPOSITORY_INTERFACE } from '@root/core/${kebabName}/I${EntityName}Repository';
import { randomUUID } from 'crypto';

describe('Update${EntityName} Use Case', () => {
  let userRepository: UserRepository;
  let ${entityName}Repository: ${EntityName}Repository;

  const clear = async (db: ReturnType<typeof getDb>) => {
    await db.delete(schema.${entityName}Schema).execute();
    await db.delete(schema.userSchema).execute();
  };

  beforeAll(async () => {
    bootstrap(
      new Module({
        imports: [
          getConfigModule(EnvFileNames.TESTING),
          getDbModule(EnvFileNames.TESTING),
          UserModule,
          ${EntityName}Module,
          Update${EntityName}Module,
        ],
      }),
    );
    userRepository = inject(USER_REPOSITORY_INTERFACE);
    ${entityName}Repository = inject(${TOKEN_BASE}_REPOSITORY_INTERFACE);
  });

  afterEach(async () => {
    await getDb().delete(schema.${entityName}Schema).execute();
    await deleteCreatedSignedUsers(userRepository);
  });

  afterAll(async () => {
    await clear(getDb());
  });

  it('should update an entity successfully', async () => {
    const { user, token } = await createOneSignedUpUser(userRepository, {
      userType: UserTypeEnum.ADMIN,
      role: AdminRoleEnum.ADMIN,
    });

    const targetId = randomUUID();
    await ${entityName}Repository.create({ id: targetId, name: 'Test ${EntityName}' } as any);

    const server = getNewTestServer({
      [update${EntityName}RoutesPath]: { handler: update${EntityName}Routes },
    });

    const pathReplaced = update${EntityName}RoutesPath.replace(':id', targetId);
    const response = await server
      .request()
      .put(pathReplaced)
      .set('Authorization', \`Bearer \${token}\`)
      .send({ name: 'Updated ${EntityName}' });

    expect(response.status).toBe(StatusCodes.OK);
    const body = response.body as any;
    expect(body.result.name).toBe('Updated ${EntityName}');
    expect(body.result.updatedBy).toBe(user.id);

    await server.close();
  });
});
`;
  await writeFile(
    join(useCaseDir, `Update${EntityName}.e2e.spec.ts`),
    testContent,
  );
}

async function generateGetE2ETest(
  baseDir: string,
  config: CrudConfig,
): Promise<void> {
  const { EntityName, entityName, kebabName, TOKEN_BASE, pluralKebab } = config;
  const useCaseDir = join(baseDir, `get-${kebabName}`);
  const testContent = `import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { inject, bootstrap, Module } from '@kanian77/simple-di';
import { getDb } from 'db/getDb';
import * as schema from '@root/schema';
import {
  createOneSignedUpUser,
  deleteCreatedSignedUsers,
} from '@root/lib/functions/test-related/createSignedUpUser';
import {
  get${EntityName}Routes,
  get${EntityName}RoutesPath,
} from './get${EntityName}Routes';
import { ${EntityName}Module } from '@root/core/${kebabName}/${EntityName}Module';
import { UserModule } from '@root/core/user/UserModule';
import { Get${EntityName}Module } from './Get${EntityName}';
import { getDbModule } from 'db/getDbModule';
import { getConfigModule } from 'config/getConfigModule';
import { EnvFileNames } from '@root/lib';
import { StatusCodes } from 'http-status-codes';
import { getNewTestServer } from '@root/lib/functions/test-related/getNewTestServer';
import { USER_REPOSITORY_INTERFACE } from '@root/core/user/IUserRepository';
import type { UserRepository } from '@root/core/user/UserRepository';
import { AdminRoleEnum } from '@root/lib/types/AdminRoleEnum';
import { UserTypeEnum } from '@root/lib/types/UserTypeEnum';
import { ${EntityName}Repository } from '@root/core/${kebabName}/${EntityName}Repository';
import { ${TOKEN_BASE}_REPOSITORY_INTERFACE } from '@root/core/${kebabName}/I${EntityName}Repository';
import { randomUUID } from 'crypto';

describe('Get${EntityName} Use Case', () => {
  let userRepository: UserRepository;
  let ${entityName}Repository: ${EntityName}Repository;

  const clear = async (db: ReturnType<typeof getDb>) => {
    await db.delete(schema.${entityName}Schema).execute();
    await db.delete(schema.userSchema).execute();
  };

  beforeAll(async () => {
    bootstrap(
      new Module({
        imports: [
          getConfigModule(EnvFileNames.TESTING),
          getDbModule(EnvFileNames.TESTING),
          UserModule,
          ${EntityName}Module,
          Get${EntityName}Module,
        ],
      }),
    );
    userRepository = inject(USER_REPOSITORY_INTERFACE);
    ${entityName}Repository = inject(${TOKEN_BASE}_REPOSITORY_INTERFACE);
  });

  afterEach(async () => {
    await getDb().delete(schema.${entityName}Schema).execute();
    await deleteCreatedSignedUsers(userRepository);
  });

  afterAll(async () => {
    await clear(getDb());
  });

  it('should get an entity successfully', async () => {
    const { user, token } = await createOneSignedUpUser(userRepository, {
      userType: UserTypeEnum.ADMIN,
      role: AdminRoleEnum.ADMIN,
    });

    const targetId = randomUUID();
    await ${entityName}Repository.create({ id: targetId, name: 'Test ${EntityName}' } as any);

    const server = getNewTestServer({
      [get${EntityName}RoutesPath]: { handler: get${EntityName}Routes },
    });

    const pathReplaced = get${EntityName}RoutesPath.replace(':id', targetId);
    const response = await server
      .request()
      .get(pathReplaced)
      .set('Authorization', \`Bearer \${token}\`);

    expect(response.status).toBe(StatusCodes.OK);
    const body = response.body as any;
    expect(body.result.id).toBe(targetId);

    await server.close();
  });
});
`;
  await writeFile(
    join(useCaseDir, `Get${EntityName}.e2e.spec.ts`),
    testContent,
  );
}

async function generateListE2ETest(
  baseDir: string,
  config: CrudConfig,
): Promise<void> {
  const {
    EntityName,
    entityName,
    kebabName,
    TOKEN_BASE,
    pluralKebab,
    pluralPascal,
  } = config;
  const useCaseDir = join(baseDir, `list-${pluralKebab}`);
  const testContent = `import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { inject, bootstrap, Module } from '@kanian77/simple-di';
import { getDb } from 'db/getDb';
import * as schema from '@root/schema';
import {
  createOneSignedUpUser,
  deleteCreatedSignedUsers,
} from '@root/lib/functions/test-related/createSignedUpUser';
import {
  list${pluralPascal}Routes,
  list${pluralPascal}RoutesPath,
} from './list${pluralPascal}Routes';
import { ${EntityName}Module } from '@root/core/${kebabName}/${EntityName}Module';
import { UserModule } from '@root/core/user/UserModule';
import { List${pluralPascal}Module } from './List${pluralPascal}';
import { getDbModule } from 'db/getDbModule';
import { getConfigModule } from 'config/getConfigModule';
import { EnvFileNames } from '@root/lib';
import { StatusCodes } from 'http-status-codes';
import { getNewTestServer } from '@root/lib/functions/test-related/getNewTestServer';
import { USER_REPOSITORY_INTERFACE } from '@root/core/user/IUserRepository';
import type { UserRepository } from '@root/core/user/UserRepository';
import { AdminRoleEnum } from '@root/lib/types/AdminRoleEnum';
import { UserTypeEnum } from '@root/lib/types/UserTypeEnum';
import { ${EntityName}Repository } from '@root/core/${kebabName}/${EntityName}Repository';
import { ${TOKEN_BASE}_REPOSITORY_INTERFACE } from '@root/core/${kebabName}/I${EntityName}Repository';
import { randomUUID } from 'crypto';

describe('List${pluralPascal} Use Case', () => {
  let userRepository: UserRepository;
  let ${entityName}Repository: ${EntityName}Repository;

  const clear = async (db: ReturnType<typeof getDb>) => {
    await db.delete(schema.${entityName}Schema).execute();
    await db.delete(schema.userSchema).execute();
  };

  beforeAll(async () => {
    bootstrap(
      new Module({
        imports: [
          getConfigModule(EnvFileNames.TESTING),
          getDbModule(EnvFileNames.TESTING),
          UserModule,
          ${EntityName}Module,
          List${pluralPascal}Module,
        ],
      }),
    );
    userRepository = inject(USER_REPOSITORY_INTERFACE);
    ${entityName}Repository = inject(${TOKEN_BASE}_REPOSITORY_INTERFACE);
  });

  afterEach(async () => {
    await getDb().delete(schema.${entityName}Schema).execute();
    await deleteCreatedSignedUsers(userRepository);
  });

  afterAll(async () => {
    await clear(getDb());
  });

  it('should list all entities successfully', async () => {
    const { user, token } = await createOneSignedUpUser(userRepository, {
      userType: UserTypeEnum.ADMIN,
      role: AdminRoleEnum.ADMIN,
    });

    await ${entityName}Repository.create({ id: randomUUID(), name: 'Test ${EntityName} 1' } as any);
    await ${entityName}Repository.create({ id: randomUUID(), name: 'Test ${EntityName} 2' } as any);

    const server = getNewTestServer({
      [list${pluralPascal}RoutesPath]: { handler: list${pluralPascal}Routes },
    });

    const response = await server
      .request()
      .get(list${pluralPascal}RoutesPath)
      .set('Authorization', \`Bearer \${token}\`);

    expect(response.status).toBe(StatusCodes.OK);
    const body = response.body as any;
    expect(Array.isArray(body.result)).toBe(true);

    await server.close();
  });
});
`;
  await writeFile(
    join(useCaseDir, `List${pluralPascal}.e2e.spec.ts`),
    testContent,
  );
}

async function generateDeleteE2ETest(
  baseDir: string,
  config: CrudConfig,
): Promise<void> {
  const { EntityName, entityName, kebabName, TOKEN_BASE, pluralKebab } = config;
  const useCaseDir = join(baseDir, `delete-${kebabName}`);
  const testContent = `import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { inject, bootstrap, Module } from '@kanian77/simple-di';
import { getDb } from 'db/getDb';
import * as schema from '@root/schema';
import { eq } from 'drizzle-orm';
import {
  createOneSignedUpUser,
  deleteCreatedSignedUsers,
} from '@root/lib/functions/test-related/createSignedUpUser';
import {
  delete${EntityName}Routes,
  delete${EntityName}RoutesPath,
} from './delete${EntityName}Routes';
import { ${EntityName}Module } from '@root/core/${kebabName}/${EntityName}Module';
import { UserModule } from '@root/core/user/UserModule';
import { Delete${EntityName}Module } from './Delete${EntityName}';
import { getDbModule } from 'db/getDbModule';
import { getConfigModule } from 'config/getConfigModule';
import { EnvFileNames } from '@root/lib';
import { StatusCodes } from 'http-status-codes';
import { getNewTestServer } from '@root/lib/functions/test-related/getNewTestServer';
import { USER_REPOSITORY_INTERFACE } from '@root/core/user/IUserRepository';
import type { UserRepository } from '@root/core/user/UserRepository';
import { AdminRoleEnum } from '@root/lib/types/AdminRoleEnum';
import { UserTypeEnum } from '@root/lib/types/UserTypeEnum';
import { ${EntityName}Repository } from '@root/core/${kebabName}/${EntityName}Repository';
import { ${TOKEN_BASE}_REPOSITORY_INTERFACE } from '@root/core/${kebabName}/I${EntityName}Repository';
import { randomUUID } from 'crypto';

describe('Delete${EntityName} Use Case', () => {
  let userRepository: UserRepository;
  let ${entityName}Repository: ${EntityName}Repository;

  const clear = async (db: ReturnType<typeof getDb>) => {
    await db.delete(schema.${entityName}Schema).execute();
    await db.delete(schema.userSchema).execute();
  };

  beforeAll(async () => {
    bootstrap(
      new Module({
        imports: [
          getConfigModule(EnvFileNames.TESTING),
          getDbModule(EnvFileNames.TESTING),
          UserModule,
          ${EntityName}Module,
          Delete${EntityName}Module,
        ],
      }),
    );
    userRepository = inject(USER_REPOSITORY_INTERFACE);
    ${entityName}Repository = inject(${TOKEN_BASE}_REPOSITORY_INTERFACE);
  });

  afterEach(async () => {
    await getDb().delete(schema.${entityName}Schema).execute();
    await deleteCreatedSignedUsers(userRepository);
  });

  afterAll(async () => {
    await clear(getDb());
  });

  it('should soft delete an entity successfully', async () => {
    const { user, token } = await createOneSignedUpUser(userRepository, {
      userType: UserTypeEnum.ADMIN,
      role: AdminRoleEnum.ADMIN,
    });

    const targetIdSoft = randomUUID();
    await ${entityName}Repository.create({ id: targetIdSoft, name: 'Test ${EntityName}' } as any);

    const server = getNewTestServer({
      [delete${EntityName}RoutesPath]: { handler: delete${EntityName}Routes },
    });

    const pathReplaced = delete${EntityName}RoutesPath.replace(':id', targetIdSoft);
    const response = await server
      .request()
      .delete(pathReplaced)
      .set('Authorization', \`Bearer \${token}\`);

    expect(response.status).toBe(StatusCodes.OK);

    const dbRecord = await getDb()
      .select()
      .from(schema.${entityName}Schema)
      .where(eq(schema.${entityName}Schema.id, targetIdSoft))
      .execute();
    expect(dbRecord.length).toBe(1);
    expect((dbRecord[0] as any).deleted).toBe(true);

    await server.close();
  });

  it('should hard delete an entity successfully', async () => {
    const { user, token } = await createOneSignedUpUser(userRepository, {
      userType: UserTypeEnum.ADMIN,
      role: AdminRoleEnum.ADMIN,
    });

    const targetIdHard = randomUUID();
    await ${entityName}Repository.create({ id: targetIdHard, name: 'Test ${EntityName}' } as any);

    const server = getNewTestServer({
      [delete${EntityName}RoutesPath]: { handler: delete${EntityName}Routes },
    });

    const pathReplaced = delete${EntityName}RoutesPath.replace(':id', targetIdHard);
    const response = await server
      .request()
      .delete(pathReplaced)
      .set('Authorization', \`Bearer \${token}\`)
      .send({ softDelete: false });

    expect(response.status).toBe(StatusCodes.OK);

    const dbRecord = await getDb()
      .select()
      .from(schema.${entityName}Schema)
      .where(eq(schema.${entityName}Schema.id, targetIdHard))
      .execute();
    expect(dbRecord.length).toBe(0);

    await server.close();
  });
});
`;
  await writeFile(
    join(useCaseDir, `Delete${EntityName}.e2e.spec.ts`),
    testContent,
  );
}

// END ROUTES
