# simpledi-app-generator

CLI tool to generate [simple-di](https://www.npmjs.com/package/@kanian77/simple-di) projects with a complete backend architecture.

## Installation

```bash
npm install -g simpledi-app-generator
```

Or link locally for development:

```bash
git clone <repo>
cd simpledi-app-generator
bun install
bun run prepare
npm link
```

## Usage

### Create a new project

```bash
simpledi new my-project
cd my-project
bun install
bun run dev
```

### Generate a module

Inside an existing project:

```bash
simpledi module user
simpledi module blog-post
```

This creates a complete module with:

- Entity schema (Drizzle ORM)
- Repository + Interface
- Service + Interface
- Module definitions
- Test file
- Auto-registers in `schema.ts` and `CoreModule.ts`

## Prerequisites

### Neon PostgreSQL

Generated projects use [Neon](https://neon.tech) serverless PostgreSQL. You **must** add your connection string to `.env.development`:

```env
DATABASE_URL=postgres://user:password@your-neon-host.neon.tech/dbname?sslmode=require
```

### Required Environment Variables

| Variable       | Description                       |
| -------------- | --------------------------------- |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET`   | Secret key for JWT tokens         |
| `PORT`         | Server port (default: 3000)       |

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
    ├── core/            # Entity modules (generated)
    ├── lib/             # Utilities, types, errors
    └── use-case/        # Use case modules
```

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Framework**: [Hono](https://hono.dev)
- **DI**: [@kanian77/simple-di](https://www.npmjs.com/package/@kanian77/simple-di)
- **ORM**: [Drizzle](https://orm.drizzle.team)
- **Database**: [Neon PostgreSQL](https://neon.tech)
- **Validation**: [Zod](https://zod.dev)

## License

MIT
