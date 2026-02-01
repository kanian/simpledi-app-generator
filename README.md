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

## Commands

| Command                                  | Description                          |
| ---------------------------------------- | ------------------------------------ |
| `simpledi new <name>`                    | Create a new simple-di project       |
| `simpledi module <entity>`               | Generate a CRUD module for an entity |
| `simpledi use-case <name> [imports=...]` | Generate a use case with routes      |

## Quick Start

```bash
# Create project
simpledi new my-app
cd my-app
bun install

# Add your DATABASE_URL to .env.development
# Generate entities
simpledi module user
simpledi module blog-post

# Generate use cases
simpledi use-case get-user imports=user
simpledi use-case create-blog-post imports=user,blog-post

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
    ├── main.routes.ts   # Route registrations
    ├── core/            # Entity modules (generated)
    ├── lib/             # Utilities, types, errors
    └── use-case/        # Use case modules
```

## Prerequisites

### Neon PostgreSQL

Generated projects use [Neon](https://neon.tech) serverless PostgreSQL. Add your connection string to `.env.development`:

```env
DATABASE_URL=postgres://user:password@your-neon-host.neon.tech/dbname?sslmode=require
```

### Environment Variables

| Variable       | Description                       |
| -------------- | --------------------------------- |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET`   | Secret key for JWT tokens         |
| `PORT`         | Server port (default: 3000)       |

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Framework**: [Hono](https://hono.dev)
- **DI**: [@kanian77/simple-di](https://www.npmjs.com/package/@kanian77/simple-di)
- **ORM**: [Drizzle](https://orm.drizzle.team)
- **Database**: [Neon PostgreSQL](https://neon.tech)
- **Validation**: [Zod](https://zod.dev)

## License

MIT
