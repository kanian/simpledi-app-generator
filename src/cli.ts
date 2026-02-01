#!/usr/bin/env node
import { generateSkeleton } from './generate_skeleton.js';
import { createModule } from './create_module.js';
import { createUseCase } from './create_use_case.js';

const args = process.argv.slice(2);
const command = args[0];
const name = args[1];

function printUsage() {
  console.log(`
simpledi - Simple DI App Generator

Usage:
  simpledi new <project-name>                        Create a new simple-di project
  simpledi module <entity-name>                      Generate a module in current project
  simpledi use-case <name> [imports=mod1,mod2,...]   Generate a use case in current project

Examples:
  simpledi new my-app
  simpledi module user
  simpledi module blog-post
  simpledi use-case get-user
  simpledi use-case create-user imports=CoreModule,ConfigModule
`);
}

function parseImports(args: string[]): string[] {
  for (const arg of args) {
    if (arg.startsWith('imports=')) {
      const importsStr = arg.slice('imports='.length);
      return importsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

async function main() {
  if (!command) {
    printUsage();
    process.exit(1);
  }

  switch (command) {
    case 'new':
      if (!name) {
        console.error('Error: Project name is required');
        console.error('Usage: simpledi new <project-name>');
        process.exit(1);
      }
      await generateSkeleton(name);
      break;

    case 'module':
      if (!name) {
        console.error('Error: Entity name is required');
        console.error('Usage: simpledi module <entity-name>');
        process.exit(1);
      }
      await createModule(name);
      break;

    case 'use-case':
      if (!name) {
        console.error('Error: Use case name is required');
        console.error(
          'Usage: simpledi use-case <name> [imports=mod1,mod2,...]',
        );
        process.exit(1);
      }
      const imports = parseImports(args.slice(2));
      await createUseCase(name, imports);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
