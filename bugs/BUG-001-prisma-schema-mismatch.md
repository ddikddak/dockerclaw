# BUG-001: Prisma Schema Database Mismatch

## Description
The `schema.prisma` file was configured to use PostgreSQL, but the `.env` file specifies a SQLite database URL (`file:./dev.db`). This causes the migration to fail with error:

```
Error: Prisma schema validation - (get-config wasm)
Error code: P1012
error: Error validating datasource `db`: the URL must start with the protocol `postgresql://` or `postgres://`.
```

## Steps to Reproduce
1. Clone repository
2. Run `npm install`
3. Run `npm run db:migrate`
4. Migration fails with P1012 error

## Fix Applied
Changed the datasource configuration in `schema.prisma` to use SQLite for development:

```prisma
// Per producció amb PostgreSQL:
// datasource db {
//   provider = "postgresql"
//   url      = env("DATABASE_URL")
// }

// Per desenvolupament local amb SQLite:
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

## Recommendation
- Add a `.env.example` with clear comments explaining the database options
- Consider using `prisma/db.ts` with conditional logic or separate schema files for different environments
- Document the database setup in README.md

## Severity
**Medium** - Blocks initial setup but easily fixable
