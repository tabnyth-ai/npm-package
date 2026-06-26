# tabnyth

Core CLI, local Hono server, shared adapter types, and bundled Preact UI for Tabnyth Studio.

Install it with one database adapter:

```bash
npm i -D tabnyth @tabnyth/mongodb
npx tabnyth --url "mongodb://localhost:27017/mydb"
```

```bash
npm i -D tabnyth @tabnyth/postgres
npx tabnyth --url "postgresql://user:pass@localhost:5432/mydb"
```

To read the database URL from a custom env file:

```json
{
  "scripts": {
    "tabnyth": "npx tabnyth .env.dev DATABASE_URL"
  }
}
```

Running `npm run tabnyth` opens a startup prompt:

```txt
View mode only - this will allow you to see data in your database
Edit mode - this will allow you to make edits
```

Use the arrow keys to pick a mode and press Enter. Use `--mode view` or `--mode edit` to skip the prompt in scripts.

Writes are disabled by default. Pass `--allow-write` only when you intentionally want write operations enabled.

## License setup

On install, Tabnyth appends a `TABNYTH_KEY=` placeholder to your project `.env`. If setup is skipped, run:

```bash
npx tabnyth setup
```

Then paste your license key into `.env`:

```dotenv
# Paste your Tabnyth license key here or get it generated from https://tabnyth.cloud/docs/generate-license-key
TABNYTH_KEY=tnk_your_license_key
```

Nyth AI requests use `TABNYTH_KEY`. During local development, point the package at your backend with:

```bash
TABNYTH_API_URL=http://localhost:8080 npx tabnyth --url "postgresql://user:pass@localhost:5432/mydb"
```
