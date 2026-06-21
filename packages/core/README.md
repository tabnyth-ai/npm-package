# tabnyth

Core CLI, local Hono server, shared adapter types, and bundled Preact UI for Tabnyth Studio.

Install it with one database adapter:

```bash
npm i -D tabnyth @tabnyth-studio/mongodb
npx tabnyth --url "mongodb://localhost:27017/mydb"
```

```bash
npm i -D tabnyth @tabnyth-studio/postgres
npx tabnyth --url "postgresql://user:pass@localhost:5432/mydb"
```

Writes are disabled by default. Pass `--allow-write` only when you intentionally want write operations enabled.
