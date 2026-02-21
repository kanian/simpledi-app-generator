import { cp, mkdir, writeFile, readdir } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory where this script is located (works in both dev and dist)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function generateSkeleton(projectName: string): Promise<void> {
  if (!projectName) {
    throw new Error('Project name is required');
  }

  const targetDir = resolve(process.cwd(), projectName);
  const templatesDir = join(__dirname, 'templates');

  console.log(`Generating skeleton in: ${targetDir}`);

  if (existsSync(targetDir)) {
    throw new Error(`Directory ${targetDir} already exists`);
  }

  await mkdir(targetDir, { recursive: true });

  // Templates Mapping
  // Define all templates and their destination
  const templates = [
    // Root Files
    { src: 'package.json', dest: 'package.json' },
    { src: 'tsconfig.json', dest: 'tsconfig.json' },
    { src: 'bunfig.toml', dest: 'bunfig.toml' },
    { src: 'drizzle.dev.config.ts', dest: 'drizzle.dev.config.ts' },
    { src: 'drizzle.prod.config.ts', dest: 'drizzle.prod.config.ts' },
    { src: '.env.development', dest: '.env.development' },
    { src: 'main.ts', dest: 'main.ts' },

    // Config
    { src: 'Config.ts', dest: 'config/Config.ts' },
    { src: 'config/getConfigModule.ts', dest: 'config/getConfigModule.ts' },

    // Src Root
    { src: 'AppModule.ts', dest: 'src/AppModule.ts' },
    { src: 'schema.ts', dest: 'src/schema.ts' },
    { src: 'src/main.routes.ts', dest: 'src/main.routes.ts' },

    // Base Classes
    { src: 'src/BaseRepository.ts', dest: 'src/BaseRepository.ts' },
    { src: 'src/BaseService.ts', dest: 'src/BaseService.ts' },
    { src: 'src/IRepository.ts', dest: 'src/IRepository.ts' },
    { src: 'src/IService.ts', dest: 'src/IService.ts' },

    // Use Case Root
    {
      src: 'src/use-case/UseCaseModule.ts',
      dest: 'src/use-case/UseCaseModule.ts',
    },
    { src: 'src/use-case/IUseCase.ts', dest: 'src/use-case/IUseCase.ts' },

    // HealthCheck Use Case
    {
      src: 'src/use-case/health-check/outputs/HealthCheckSuccess.ts',
      dest: 'src/use-case/health-check/outputs/HealthCheckSuccess.ts',
    },
    {
      src: 'src/use-case/health-check/HealthCheck.ts',
      dest: 'src/use-case/health-check/HealthCheck.ts',
    },
    {
      src: 'src/use-case/health-check/healthCheckRoutes.ts',
      dest: 'src/use-case/health-check/healthCheckRoutes.ts',
    },

    // DB
    { src: 'db/DbService.ts', dest: 'db/DbService.ts' },
    { src: 'db/getDb.ts', dest: 'db/getDb.ts' },
    { src: 'db/getDbModule.ts', dest: 'db/getDbModule.ts' },
    { src: 'db/initDb.ts', dest: 'db/initDb.ts' },

    // Lib - Types
    {
      src: 'src/lib/types/BaseEntityInterface.ts',
      dest: 'src/lib/types/BaseEntityInterface.ts',
    },
    {
      src: 'src/lib/types/EnvFileNames.ts',
      dest: 'src/lib/types/EnvFileNames.ts',
    },
    { src: 'src/lib/types/Envs.ts', dest: 'src/lib/types/Envs.ts' },
    {
      src: 'src/lib/types/FailedOperation.ts',
      dest: 'src/lib/types/FailedOperation.ts',
    },
    {
      src: 'src/lib/types/OperationResult.ts',
      dest: 'src/lib/types/OperationResult.ts',
    },
    {
      src: 'src/lib/types/SharedStubs.ts',
      dest: 'src/lib/types/SharedStubs.ts',
    },
    {
      src: 'src/lib/types/SuccessfullOperation.ts',
      dest: 'src/lib/types/SuccessfullOperation.ts',
    },
    {
      src: 'src/lib/types/TableNameToken.ts',
      dest: 'src/lib/types/TableNameToken.ts',
    },
    {
      src: 'src/lib/types/TokenPayload.ts',
      dest: 'src/lib/types/TokenPayload.ts',
    },
    {
      src: 'src/lib/types/UserInterface.ts',
      dest: 'src/lib/types/UserInterface.ts',
    },
    {
      src: 'src/lib/types/getCorsOrigin.ts',
      dest: 'src/lib/types/getCorsOrigin.ts',
    },
    {
      src: 'src/lib/types/UserRoleEnum.ts',
      dest: 'src/lib/types/UserRoleEnum.ts',
    },
    {
      src: 'src/lib/types/UserTypeEnum.ts',
      dest: 'src/lib/types/UserTypeEnum.ts',
    },
    {
      src: 'src/lib/types/AdminRoleEnum.ts',
      dest: 'src/lib/types/AdminRoleEnum.ts',
    },
    {
      src: 'src/lib/types/AnyRoleEnum.ts',
      dest: 'src/lib/types/AnyRoleEnum.ts',
    },
    {
      src: 'src/lib/types/PhoneNumberTypeEnum.ts',
      dest: 'src/lib/types/PhoneNumberTypeEnum.ts',
    },
    {
      src: 'src/lib/types/PhoneNumberInterface.ts',
      dest: 'src/lib/types/PhoneNumberInterface.ts',
    },
    {
      src: 'src/lib/types/UserRolePgEnum.ts',
      dest: 'src/lib/types/UserRolePgEnum.ts',
    },
    {
      src: 'src/lib/types/UserTypePgEnum.ts',
      dest: 'src/lib/types/UserTypePgEnum.ts',
    },

    // Lib - Functions
    {
      src: 'src/lib/functions/getEnvFile.ts',
      dest: 'src/lib/functions/getEnvFile.ts',
    },
    {
      src: 'src/lib/functions/getContextUser.ts',
      dest: 'src/lib/functions/getContextUser.ts',
    },
    {
      src: 'src/lib/functions/getHostname.ts',
      dest: 'src/lib/functions/getHostname.ts',
    },
    {
      src: 'src/lib/functions/isNotNullNorUndefined.ts',
      dest: 'src/lib/functions/isNotNullNorUndefined.ts',
    },
    {
      src: 'src/lib/functions/tableName.ts',
      dest: 'src/lib/functions/tableName.ts',
    },
    {
      src: 'src/lib/functions/withBaseSchema.ts',
      dest: 'src/lib/functions/withBaseSchema.ts',
    },
    // Lib - Functions/test-related
    {
      src: 'src/lib/functions/test-related/getTestServer.ts',
      dest: 'src/lib/functions/test-related/getTestServer.ts',
    },
    {
      src: 'src/lib/functions/test-related/getNewTestServer.ts',
      dest: 'src/lib/functions/test-related/getNewTestServer.ts',
    },
    {
      src: 'src/lib/functions/test-related/createSignedUpUser.ts',
      dest: 'src/lib/functions/test-related/createSignedUpUser.ts',
    },
    {
      src: 'src/lib/functions/test-related/getOneUserSignupData.ts',
      dest: 'src/lib/functions/test-related/getOneUserSignupData.ts',
    },
    // Middlewares
    {
      src: 'src/middlewares/authGuard.ts',
      dest: 'src/middlewares/authGuard.ts',
    },
    {
      src: 'src/middlewares/roleGuard.ts',
      dest: 'src/middlewares/roleGuard.ts',
    },

    // Lib - Errors
    {
      src: 'src/lib/errors/BadRequestException.ts',
      dest: 'src/lib/errors/BadRequestException.ts',
    },
    {
      src: 'src/lib/errors/ConflictException.ts',
      dest: 'src/lib/errors/ConflictException.ts',
    },
    {
      src: 'src/lib/errors/ForbiddenException.ts',
      dest: 'src/lib/errors/ForbiddenException.ts',
    },
    {
      src: 'src/lib/errors/HttpException.ts',
      dest: 'src/lib/errors/HttpException.ts',
    },
    {
      src: 'src/lib/errors/InternalServerException.ts',
      dest: 'src/lib/errors/InternalServerException.ts',
    },
    {
      src: 'src/lib/errors/NotFoundException.ts',
      dest: 'src/lib/errors/NotFoundException.ts',
    },
    {
      src: 'src/lib/errors/UnauthorizedException.ts',
      dest: 'src/lib/errors/UnauthorizedException.ts',
    },

    // Lib - Root
    {
      src: 'src/lib/AuthenticationUtils.ts',
      dest: 'src/lib/AuthenticationUtils.ts',
    },

    // Lib - Schemas
    {
      src: 'src/lib/schemas/phoneNumberSchema.ts',
      dest: 'src/lib/schemas/phoneNumberSchema.ts',
    },
    // Core
    {
      src: 'src/core/baseSchema.ts',
      dest: 'src/core/baseSchema.ts',
    },
    {
      src: 'src/core/baseZodSchema.ts',
      dest: 'src/core/baseZodSchema.ts',
    },
    {
      src: 'src/core/user',
      dest: 'src/core/user',
    },
  ];

  // Helper function to read template and write to dest
  const applyTemplate = async (tpl: { src: string; dest: string }) => {
    const srcPath = join(templatesDir, tpl.src);
    const destPath = join(targetDir, tpl.dest);

    // Ensure parent dir exists
    const parentDir = resolve(destPath, '..');
    if (!existsSync(parentDir)) {
      await mkdir(parentDir, { recursive: true });
    }

    if (existsSync(srcPath)) {
      await cp(srcPath, destPath, { recursive: true });
      console.log(`Created ${tpl.dest}`);
    } else {
      console.error(`Error: Template ${tpl.src} not found at ${srcPath}`);
    }
  };

  for (const tpl of templates) {
    await applyTemplate(tpl);
  }

  const libTypesDest = join(targetDir, 'src/lib/types');
  const libSchemasDest = join(targetDir, 'src/lib/schemas');
  const libFunctionsDest = join(targetDir, 'src/lib/functions');
  const libTestFunctionsDest = join(
    targetDir,
    'src/lib/functions/test-related',
  );
  const libErrorsDest = join(targetDir, 'src/lib/errors');
  const middlewaresDest = join(targetDir, 'src/middlewares');
  const libDest = join(targetDir, 'src/lib');
  const coreDir = join(targetDir, 'src/core');

  await mkdir(coreDir, { recursive: true });

  // lib/types/index.ts
  const createIndex = async (dir: string) => {
    if (!existsSync(dir)) return;
    const files = await readdir(dir);
    const indexContent = files
      .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
      .map((f) => `export * from './${f.replace('.ts', '')}';`)
      .join('\n');
    await writeFile(join(dir, 'index.ts'), indexContent);
    console.log(`Created index for ${dir}`);
  };

  await createIndex(libTypesDest);
  await createIndex(libSchemasDest);
  await createIndex(libFunctionsDest);
  await createIndex(libTestFunctionsDest);
  await createIndex(libErrorsDest);
  await createIndex(middlewaresDest);

  // lib/index.ts
  const libIndexContent = `export * from "./functions";
export * from "./types";
export * from "./schemas";
export * from "./errors";`;
  await writeFile(join(libDest, 'index.ts'), libIndexContent);
  console.log('Created lib/index.ts');

  // Create CoreModule.ts
  const coreModuleContent = `import { Module } from '@kanian77/simple-di';
import { getConfigModule } from 'config/getConfigModule';
import { getDbModule } from 'db/getDbModule';
import { UserModule } from './user/UserModule';

export const CoreModule = new Module({
  imports: [
    getConfigModule(),
    getDbModule(),
    UserModule,
  ],
});
`;
  await writeFile(join(coreDir, 'CoreModule.ts'), coreModuleContent);
  console.log('Created src/core/CoreModule.ts');

  // Create src/core/baseZodSchema.ts
  const baseZodSchemaContent = `import { z } from "zod";

export const baseZodSchema = z.object({
  id: z.string().uuid(),
  deleted: z.boolean().default(false),
  deletedAt: z.date().nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});`;
  await writeFile(join(coreDir, 'baseZodSchema.ts'), baseZodSchemaContent);
  console.log('Created src/core/baseZodSchema.ts');

  console.log(`\n✅ Skeleton generation complete!`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${projectName}`);
  console.log(`  bun install`);
  console.log(`  bun run dev`);
}
