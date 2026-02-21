# simpledi-app-generator

CLI tool to generate [simple-di](https://www.npmjs.com/package/@kanian77/simple-di) projects with a complete backend architecture.

## Installation

```bash
npm install -g @kanian77/simple-di-app-generator
```

Or link locally for development:

```bash
git clone <repo>
cd simpledi-app-generator
bun install
bun run prepare
npm link
```

## Commands

| Command                                  | Description                           |
| ---------------------------------------- | ------------------------------------- |
| `simpledi new <name>`                    | Create a new simple-di project        |
| `simpledi module <entity>`               | Generate a module with CRUD use cases |
| `simpledi use-case <name> [imports=...]` | Generate a use case with routes       |

## Quick Start

```bash
# Create project
simpledi new my-app
cd my-app
bun install

# Add your DATABASE_URL to .env.development
# Generate entities (includes CRUD use cases!)
simpledi module user
simpledi module blog-post

# Generate custom use cases
simpledi use-case get-dashboard-stats imports=user,blog-post
simpledi use-case publish-post imports=blog-post

# Run
bun run dev
```

## Documentation

See [user-guide.md](./user-guide.md) for complete documentation.

## Project Structure

Generated projects follow this structure:

```
my-project/
├── main.ts              # Entry point
├── config/              # Configuration module
├── db/                  # Database service module
└── src/
    ├── AppModule.ts     # Root module
    ├── schema.ts        # Drizzle schema exports
    ├── main.routes.ts   # Auto-discovers *Routes.{ts,js} files via Bun glob
    ├── core/            # Entity modules (generated)
    ├── lib/             # Utilities, types, errors
    └── use-case/        # Use case modules
```

## Prerequisites

### Neon PostgreSQL

Generated projects use [Neon](https://neon.tech) serverless PostgreSQL. Add your connection string to `.env.development`:

```env
CONNECTION_STRING=postgres://user:password@your-neon-host.neon.tech/dbname?sslmode=require
```

### Environment Variables

| Variable            | Description                       |
| ------------------- | --------------------------------- |
| `CONNECTION_STRING` | Neon PostgreSQL connection string |
| `JWT_SECRET`        | Secret key for JWT tokens         |
| `PORT`              | Server port (default: 3000)       |

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Framework**: [Hono](https://hono.dev)
- **DI**: [@kanian77/simple-di](https://www.npmjs.com/package/@kanian77/simple-di)
- **ORM**: [Drizzle](https://orm.drizzle.team)
- **Database**: [Neon PostgreSQL](https://neon.tech)
- **Validation**: [Zod](https://zod.dev)

## License

MIT
