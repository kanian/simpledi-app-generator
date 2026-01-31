import { mkdir, writeFile, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';

// Helper functions for string manipulation
function toPascalCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
    .replace(/[\s-_]+/g, '');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

function toUpperSnakeCase(str: string): string {
  return toSnakeCase(str).toUpperCase();
}

// Simple pluralizer (naive but works for most standard English words)
function pluralize(str: string): string {
  if (str.endsWith('y')) return str.slice(0, -1) + 'ies';
  if (str.endsWith('s')) return str + 'es';
  return str + 's';
}

export async function createModule(rawName: string): Promise<void> {
  if (!rawName) {
    throw new Error('Entity name is required');
  }

  const EntityName = toPascalCase(rawName); // e.g. BlogPost
  const entityName = toCamelCase(rawName); // e.g. blogPost
  const kebabName = toKebabCase(rawName); // e.g. blog-post
  const snakeName = toSnakeCase(rawName); // e.g. blog_post
  const TOKEN_BASE = toUpperSnakeCase(rawName); // e.g. BLOG_POST
  const tableName = pluralize(snakeName); // e.g. blog_posts

  console.log(`Creating module for entity: ${EntityName}`);
  console.log(`Directory: src/core/${kebabName}`);
  console.log(`Table: ${tableName}`);

  const srcDir = resolve(process.cwd(), 'src');
  const targetDir = resolve(srcDir, 'core', kebabName);

  if (existsSync(targetDir)) {
    throw new Error(`Directory ${targetDir} already exists`);
  }

  await mkdir(targetDir, { recursive: true });

  // File Templates

  // 1. baseZod[Entity]Schema.ts (New in Phase 4)
  const baseZodSchemaContent = `import { z } from "zod";
import { baseZodSchema } from "@root/core/baseZodSchema";

export const baseZod${EntityName}Schema = baseZodSchema.extend({
  // add other properties here
});
export type ${EntityName}Interface = z.infer<typeof baseZod${EntityName}Schema>;
`;

  // 2. [Entity].ts
  const schemaContent = `import { withBaseSchema } from '@root/lib/functions/withBaseSchema';
import { text } from 'drizzle-orm/pg-core';
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod';
import { baseZod${EntityName}Schema } from './baseZod${EntityName}Schema';

// Table name constant
export const ${TOKEN_BASE}_TABLE_NAME = '${tableName}';

// Schema definition
export const ${entityName}Schema = withBaseSchema(${TOKEN_BASE}_TABLE_NAME, {
  // TODO: Add entity fields here
  name: text('name').notNull(),
});

// Relations definition
// import { relations } from 'drizzle-orm';
// export const ${entityName}Relations = relations(${entityName}Schema, ({ one, many }) => ({
//   // TODO: Add relationships here
// }));

// Type exports
export type ${EntityName}SchemaType = typeof ${entityName}Schema;

// Zod validation schemas
export const ${EntityName}InsertSchema = createInsertSchema(${entityName}Schema).merge(
  baseZod${EntityName}Schema.partial({
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
    deleted: true,
  })
);

export const ${EntityName}SelectSchema = createSelectSchema(${entityName}Schema).merge(
  baseZod${EntityName}Schema
);

export const ${EntityName}UpdateSchema = createUpdateSchema(${entityName}Schema).merge(
  baseZod${EntityName}Schema.partial()
);
`;

  // 3. I[Entity]Repository.ts
  const iRepoContent = `import type { IRepository } from '@root/IRepository';
import type { ${EntityName}Interface } from './baseZod${EntityName}Schema';

export const ${TOKEN_BASE}_REPOSITORY_INTERFACE = 'I${EntityName}Repository';

export interface I${EntityName}Repository extends IRepository<${EntityName}Interface> {
  // Add entity-specific repository methods here
}
`;

  // 4. [Entity]Repository.ts
  const repoContent = `import { BaseRepository } from '@root/BaseRepository';
import {
  ${TOKEN_BASE}_REPOSITORY_INTERFACE,
  type I${EntityName}Repository,
} from './I${EntityName}Repository';
import { ${entityName}Schema, type ${EntityName}SchemaType } from './${EntityName}';
import { type ${EntityName}Interface } from './baseZod${EntityName}Schema';
import { Inject, Service } from '@kanian77/simple-di';
import { DB_SERVICE, DbService } from 'db/DbService';

@Service({ token: ${TOKEN_BASE}_REPOSITORY_INTERFACE })
export class ${EntityName}Repository
  extends BaseRepository<${EntityName}Interface, ${EntityName}SchemaType>
  implements I${EntityName}Repository
{
  constructor(@Inject(DB_SERVICE) private dbService: DbService) {
    super(${entityName}Schema, dbService);
  }

  async find(config?: any): Promise<${EntityName}Interface[]> {
    return (await this.db.query.${entityName}Schema.findMany(
      config
    )) as unknown as ${EntityName}Interface[];
  }

  async findOne(config?: any): Promise<${EntityName}Interface> {
    return (await this.db.query.${entityName}Schema.findFirst(
      config
    )) as unknown as ${EntityName}Interface;
  }
}
`;

  // 5. [Entity]RepositoryModule.ts
  const repoModuleContent = `import { Module } from '@kanian77/simple-di';
import { ${TOKEN_BASE}_REPOSITORY_INTERFACE } from './I${EntityName}Repository';
import { ${EntityName}Repository } from './${EntityName}Repository';
import { getConfigModule } from 'config/getConfigModule';
import { getDbModule } from 'db/getDbModule';

export const ${EntityName}RepositoryModule = new Module({
  imports: [getConfigModule(), getDbModule()],
  providers: [
    {
      provide: ${TOKEN_BASE}_REPOSITORY_INTERFACE,
      useClass: ${EntityName}Repository,
    },
  ],
});
`;

  // 6. I[Entity]Service.ts
  const iServiceContent = `import type { IService } from '@root/IService';
import type { ${EntityName}Interface } from './baseZod${EntityName}Schema';

export const ${TOKEN_BASE}_SERVICE_INTERFACE = 'I${EntityName}Service';

export interface I${EntityName}Service extends IService<${EntityName}Interface> {
  // Add entity-specific service methods here
}
`;

  // 7. [Entity]Service.ts
  const serviceContent = `import { BaseService } from '@root/BaseService';
import type { ${EntityName}Interface } from './baseZod${EntityName}Schema';
import {
  ${TOKEN_BASE}_SERVICE_INTERFACE,
  type I${EntityName}Service,
} from './I${EntityName}Service';
import {
  ${TOKEN_BASE}_REPOSITORY_INTERFACE,
  type I${EntityName}Repository,
} from './I${EntityName}Repository';
import {
  ${EntityName}InsertSchema,
  ${EntityName}SelectSchema,
  ${EntityName}UpdateSchema,
} from './${EntityName}';
import { Inject, Service } from '@kanian77/simple-di';

@Service({ token: ${TOKEN_BASE}_SERVICE_INTERFACE })
export class ${EntityName}Service
  extends BaseService<${EntityName}Interface>
  implements I${EntityName}Service
{
  constructor(
    @Inject(${TOKEN_BASE}_REPOSITORY_INTERFACE)
    private readonly ${entityName}Repository: I${EntityName}Repository
  ) {
    super(
      ${entityName}Repository,
      ${EntityName}InsertSchema,
      ${EntityName}UpdateSchema,
      ${EntityName}SelectSchema
    );
  }
}
`;

  // 8. [Entity]ServiceModule.ts
  const serviceModuleContent = `import { Module } from '@kanian77/simple-di';
import { ${EntityName}Service } from './${EntityName}Service';
import { ${EntityName}RepositoryModule } from './${EntityName}RepositoryModule';
import { ${TOKEN_BASE}_SERVICE_INTERFACE } from './I${EntityName}Service';

export const ${EntityName}ServiceModule = new Module({
  imports: [${EntityName}RepositoryModule],
  providers: [
    {
      provide: ${TOKEN_BASE}_SERVICE_INTERFACE,
      useClass: ${EntityName}Service,
    },
  ],
});
`;

  // 9. [Entity]Module.ts
  const mainModuleContent = `import { Module } from '@kanian77/simple-di';
import { ${EntityName}RepositoryModule } from './${EntityName}RepositoryModule';
import { ${EntityName}ServiceModule } from './${EntityName}ServiceModule';

export const ${EntityName}Module = new Module({
  imports: [${EntityName}RepositoryModule, ${EntityName}ServiceModule],
});
`;

  // 10. [Entity]Repository.spec.ts
  const testContent = `import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { ${EntityName}Repository } from './${EntityName}Repository';
import { randomUUIDv7 } from 'bun';
import * as schema from '@root/schema';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import {
  EnvFileNames,
} from '@root/lib';
import { ${TOKEN_BASE}_REPOSITORY_INTERFACE } from './I${EntityName}Repository';
import { bootstrap, inject, Module } from '@kanian77/simple-di';
import { DB_SERVICE, DbService } from 'db/DbService';
import { getConfigModule } from 'config/getConfigModule';

describe('${EntityName}Repository', () => {
  let ${entityName}Repository: ${EntityName}Repository;
  let db: NeonHttpDatabase<typeof schema>;

  const clear = async (db: NeonHttpDatabase<typeof schema>) => {
    // await db.delete(schema.${entityName}Schema).execute();
  };

  beforeAll(async () => {
    const ConfigModule = getConfigModule(EnvFileNames.TESTING);
    const DbModule = getConfigModule(EnvFileNames.TESTING);

    const ${EntityName}RepositoryModule = new Module({
      imports: [ConfigModule, DbModule],
      providers: [
        {
          provide: ${TOKEN_BASE}_REPOSITORY_INTERFACE,
          useClass: ${EntityName}Repository,
        },
      ],
    });

    const TestModule = new Module({
      imports: [
        ConfigModule,
        DbModule,
        ${EntityName}RepositoryModule,
      ],
    });

    bootstrap(TestModule);

    db = inject<DbService>(DB_SERVICE).getDb();
    ${entityName}Repository = inject<${EntityName}Repository>(${TOKEN_BASE}_REPOSITORY_INTERFACE);

    await clear(db);
  });

  afterEach(async () => {
    // await db.delete(schema.${entityName}Schema).execute();
  });

  afterAll(async () => {
    await clear(db);
  });

  it('should be defined', () => {
    expect(${entityName}Repository).toBeDefined();
  });
});
`;

  // Write files
  const files = [
    { name: `baseZod${EntityName}Schema.ts`, content: baseZodSchemaContent },
    { name: `${EntityName}.ts`, content: schemaContent },
    { name: `I${EntityName}Repository.ts`, content: iRepoContent },
    { name: `${EntityName}Repository.ts`, content: repoContent },
    { name: `${EntityName}RepositoryModule.ts`, content: repoModuleContent },
    { name: `I${EntityName}Service.ts`, content: iServiceContent },
    { name: `${EntityName}Service.ts`, content: serviceContent },
    { name: `${EntityName}ServiceModule.ts`, content: serviceModuleContent },
    { name: `${EntityName}Module.ts`, content: mainModuleContent },
    { name: `${EntityName}Repository.spec.ts`, content: testContent },
  ];

  for (const file of files) {
    await writeFile(join(targetDir, file.name), file.content);
    console.log(`Created: ${file.name}`);
  }

  // Auto-Registration

  // 1. src/schema.ts
  const schemaPath = join(srcDir, 'schema.ts');
  if (existsSync(schemaPath)) {
    let content = await readFile(schemaPath, 'utf8');
    const exportStatement = `export * from "@root/core/${kebabName}/${EntityName}";`;
    if (!content.includes(exportStatement)) {
      content += `\n${exportStatement}\n`;
      await writeFile(schemaPath, content);
      console.log(`Updated src/schema.ts`);
    }
  } else {
    console.warn(`Warning: src/schema.ts not found`);
  }

  // 2. src/core/CoreModule.ts
  const coreModulePath = join(srcDir, 'core/CoreModule.ts');
  if (existsSync(coreModulePath)) {
    let content = await readFile(coreModulePath, 'utf8');
    const importStatement = `import { ${EntityName}Module } from './${kebabName}/${EntityName}Module';`;

    if (!content.includes(importStatement)) {
      // Add import
      // Attempt to insert after last import or at top
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
      const importsStartIndex = content.indexOf('imports: [');
      if (importsStartIndex !== -1) {
        const arrayStart = importsStartIndex + 'imports: ['.length;
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
            // Determine indentation
            const insertion = `${separator}\n    ${EntityName}Module,`;

            content =
              content.slice(0, endIndex) + insertion + content.slice(endIndex);
            await writeFile(coreModulePath, content);
            console.log(`Updated src/core/CoreModule.ts`);
          }
        } else {
          console.warn(
            'Warning: Could not find closing bracket for imports array in CoreModule.ts',
          );
        }
      } else {
        // Try regex if exact string 'imports: [' not found (e.g. whitespace differences)
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
              const insertion = `${separator}\n    ${EntityName}Module,`;
              content =
                content.slice(0, endIndex) +
                insertion +
                content.slice(endIndex);
              await writeFile(coreModulePath, content);
              console.log(`Updated src/core/CoreModule.ts`);
            }
          }
        } else {
          console.warn(
            'Warning: Could not find imports array in CoreModule.ts',
          );
        }
      }
    }
  } else {
    console.warn('Warning: src/core/CoreModule.ts not found');
  }

  console.log('\n✅ Module generation complete!');
}
