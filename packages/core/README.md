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

## License setup

On install, Tabnyth asks for your license key and writes it to `tabnyth.config.json` in your project root. If the prompt is skipped, run:

```bash
npx tabnyth setup
```

The config file is intentionally small:

```json
{
  "licenseKey": "tnk_your_license_key"
}
```

Nyth AI requests use that license key. During local development, point the package at your backend with:

```bash
TABNYTH_API_URL=http://localhost:8080 npx tabnyth --url "postgresql://user:pass@localhost:5432/mydb"
```
