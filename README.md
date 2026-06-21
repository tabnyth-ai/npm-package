# Tabnyth Studio

Small local database studio for development. It starts a localhost web UI, browses MongoDB/Postgres data, and runs queries with write operations disabled unless explicitly enabled.

## Packages

```txt
tabnyth              CLI, local server, shared adapter types, bundled UI
@tabnyth/postgres           Postgres adapter and pg dependency
@tabnyth/mongodb            MongoDB adapter and mongodb dependency
```

The core package does not include database drivers. Install the adapter you need as a dev dependency.

## Usage

MongoDB:

```bash
npm i -D tabnyth @tabnyth/mongodb
npx tabnyth --url "mongodb://localhost:27017/mydb"
```

Postgres:

```bash
npm i -D tabnyth @tabnyth/postgres
npx tabnyth --url "postgresql://user:pass@localhost:5432/mydb"
```

From an environment variable:

```bash
npx tabnyth --env DATABASE_URL
```

Enable write operations explicitly:

```bash
npx tabnyth --env DATABASE_URL --allow-write
```

Write mode supports two edit paths:

```txt
Query Editor:
- Run SQL write queries for Postgres.
- Run MongoDB insertOne, updateOne, and deleteOne JSON operations.

Data Browser:
- Double-click editable cells.
- Edit multiple cells before saving.
- Click Save.
- Confirm the irreversible database update in the modal.
```

Inline Data Browser edits require `--allow-write`. Postgres tables must have a primary key. MongoDB documents must include `_id`.

## CLI Options

```txt
--url <url>              Database URL
--env <name>             Env var name, default DATABASE_URL
--adapter <name>         postgres or mongodb, optional override
--host <host>            Default 127.0.0.1
--port <port>            Default 5555
--limit <number>         Default 100
--max-limit <number>     Default 1000
--timeout-ms <number>    Default 10000
--allow-write            Enables write/destructive queries
```

## Query Examples

Postgres:

```sql
select * from "public"."users" limit 100;
```

MongoDB find:

```json
{
  "collection": "users",
  "operation": "find",
  "filter": {
    "role": "admin"
  },
  "limit": 100
}
```

MongoDB aggregation:

```json
{
  "collection": "users",
  "operation": "aggregate",
  "pipeline": [
    { "$match": { "role": "admin" } }
  ],
  "limit": 100
}
```

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

The repository uses npm workspaces:

```txt
packages/core      CLI, Hono API server, Preact UI, safety guards
packages/postgres  Postgres adapter
packages/mongodb   MongoDB adapter
```

Maintenance rules:

```txt
UI never imports pg or mongodb.
Core never imports pg or mongodb directly.
Server talks only to the DatabaseAdapter interface.
Each database adapter returns the same QueryResult shape.
Read-only mode is the default.
```
