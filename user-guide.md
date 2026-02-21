# simpledi-app-generator User Guide

Complete guide for using the simpledi-app-generator CLI to create and extend simple-di applications.

## Quick Start

```bash
# Install globally
npm install -g @kanian77/simple-di-app-generator

# Create a new project
simpledi new my-app
cd my-app
bun install
bun run dev
```

---

## Commands

### `simpledi new <project-name>`

Creates a new simple-di project with a complete backend structure.

```bash
simpledi new my-app
```

**Generated structure:**

```
my-app/
├── main.ts              # Application entry point
├── config/              # Configuration module
├── db/                  # Database service module
└── src/
    ├── AppModule.ts     # Root DI module
    ├── schema.ts        # Drizzle schema exports
    ├── main.routes.ts   # Auto-discovers *Routes.{ts,js} via Bun glob
    ├── core/            # Entity modules
    │   └── CoreModule.ts
    ├── lib/             # Utilities, types, errors
    └── use-case/        # Use case modules
        ├── IUseCase.ts
        ├── UseCaseModule.ts
        └── health-check/
```

> [!NOTE]
> Routes are **automatically registered** — any file matching `*Routes.{ts,js}` that exports `Route` and `Path` is picked up by the glob scanner. No manual wiring needed.

---

### `simpledi module <entity-name>`

Generates a complete CRUD module for an entity inside an existing project.

```bash
simpledi module user
simpledi module blog-post
```

**Generated files** in `src/core/<entity-name>/`:

| File                          | Purpose                         |
| ----------------------------- | ------------------------------- |
| `baseZod<Entity>Schema.ts`    | Zod schema with base properties |
| `<Entity>.ts`                 | Drizzle table schema            |
| `I<Entity>Repository.ts`      | Repository interface            |
| `<Entity>Repository.ts`       | Repository implementation       |
| `<Entity>RepositoryModule.ts` | Repository DI module            |
| `I<Entity>Service.ts`         | Service interface               |
| `<Entity>Service.ts`          | Service implementation          |
| `<Entity>ServiceModule.ts`    | Service DI module               |
| `<Entity>Module.ts`           | Main module (combines all)      |
| `<Entity>Repository.spec.ts`  | Test file                       |

**Generated Use Cases** in `src/use-case/<entity-name>/`:

| Use Case         | Route  | Method   |
| ---------------- | ------ | -------- |
| `Create<Entity>` | `/`    | `POST`   |
| `Update<Entity>` | `/:id` | `PUT`    |
| `Get<Entity>`    | `/:id` | `GET`    |
| `List<Entity>s`  | `/`    | `GET`    |
| `Delete<Entity>` | `/:id` | `DELETE` |

**Auto-registration:**

- Adds export to `src/schema.ts`
- Adds module to `src/core/CoreModule.ts`
- Adds use case module to `src/use-case/UseCaseModule.ts`
- Routes are auto-discovered via `main.routes.ts` glob — no manual registration required

---

### `simpledi use-case <name> [imports=entity1,entity2,...]`

Generates a custom use case with routes and typed outputs.

```bash
# Simple use case
simpledi use-case get-dashboard-stats

# Use case with module imports
simpledi use-case publish-post imports=blog-post
simpledi use-case assign-role imports=user
```

**Generated files** in `src/use-case/<name>/`:

| File                       | Purpose                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| `<Name>.ts`                | Use case class with `@Service` decorator and Module export         |
| `<name>Routes.ts`          | Hono route handler — exports `Route` and `Path` for auto-discovery |
| `outputs/<Name>Success.ts` | Typed success response + payload type                              |
| `outputs/<Name>Failure.ts` | Typed failure response                                             |
| `<Name>.e2e.spec.ts`       | Stub E2E test _(only when `imports=` is provided)_                 |

**Auto-registration:**

- Adds module to `src/use-case/UseCaseModule.ts`
- Route is auto-discovered via `main.routes.ts` glob — no manual registration required

**`imports=` parameter:**

When you specify `imports=user,cohort,enrollment` the generator:

1. Adds each entity's `Module` to the use case module's `imports` array
2. Generates a ready-to-run stub E2E spec (`<Name>.e2e.spec.ts`) that:
   - Imports each entity's `Repository` type and `*_REPOSITORY_INTERFACE` token
   - Declares `let` variables for each repository
   - Wires up `bootstrap()` with all modules + the use case module
   - Calls `inject()` for each repository
   - Cleans up schemas in **reverse** import order (dependencies last)
   - Includes a `test('repos are defined')` smoke test to verify DI is wired correctly

```bash
# Generates EnrollStudent.e2e.spec.ts with user, cohort, enrollment repo setup
simpledi use-case enroll-student imports=user,cohort,enrollment
```

---

## Response Pattern

All use cases return standardized response objects:

```typescript
// Success response
class SuccessfullOperation {
  success = true;
  message: string;
  result: any;
}

// Failure response
class FailedOperation {
  success = false;
  message: string;
  result = null;
}
```

Your generated use case outputs extend these base classes:

```typescript
// Success
export class GetUserSuccess extends SuccessfullOperation {
  constructor(
    result: GetUserPayload,
    message = 'GetUser executed successfully',
  ) {
    super(message);
    this.result = result;
  }
}

// Failure
export class GetUserFailure extends FailedOperation {
  constructor(message = 'GetUser failed to execute') {
    super(message);
  }
}
```

---

## Development Setup

```bash
# Clone and setup
git clone <repo>
cd simpledi-app-generator
bun install
bun run prepare
npm link

# Make changes and rebuild
bun run prepare
```

---

## Environment Variables

| Variable            | Description                       |
| ------------------- | --------------------------------- |
| `CONNECTION_STRING` | Neon PostgreSQL connection string |
| `JWT_SECRET`        | Secret key for JWT tokens         |
| `PORT`              | Server port (default: 3000)       |

---

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Framework**: [Hono](https://hono.dev)
- **DI**: [@kanian77/simple-di](https://www.npmjs.com/package/@kanian77/simple-di)
- **ORM**: [Drizzle](https://orm.drizzle.team)
- **Database**: [Neon PostgreSQL](https://neon.tech)
- **Validation**: [Zod](https://zod.dev)
