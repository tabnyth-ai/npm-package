# tabnyth-studio

Core CLI, local Hono server, shared adapter types, and bundled Preact UI for Tabnyth Studio.

Install it with one database adapter:

```bash
npm i -D tabnyth-studio @tabnyth-studio/mongodb
npx tabnyth-studio --url "mongodb://localhost:27017/mydb"
```

```bash
npm i -D tabnyth-studio @tabnyth-studio/postgres
npx tabnyth-studio --url "postgresql://user:pass@localhost:5432/mydb"
```

Writes are disabled by default. Pass `--allow-write` only when you intentionally want write operations enabled.
