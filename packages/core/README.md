# tabnyth

**Local-first database studio for MongoDB and Postgres.** Point it at your database and get a localhost web UI to browse collections/tables, search real data, run guarded queries, edit cells, and visualize relationships — all from your terminal. Writes are disabled by default.

🌐 **Website:** [tabnyth.cloud](https://tabnyth.cloud) · 📚 **Docs:** [tabnyth.cloud/docs](https://tabnyth.cloud/docs)

```bash
npm i -D tabnyth @tabnyth/mongodb
npx tabnyth --url "mongodb://localhost:27017/mydb"
```

## Why Tabnyth

- 🔒 **Read-only by default** — writes stay off until you explicitly opt in.
- ⚡ **Zero config** — no accounts, no cloud. One command spins up a local studio at `127.0.0.1`.
- 🔎 **Browse & search** — page through collections and tables and search across your real data.
- 🧮 **Guarded queries** — run Mongo and SQL queries with built-in safety limits.
- ✏️ **Inline edits** — edit cells directly once you switch to edit mode.
- 🕸️ **Visualize relationships** — see how your data connects.
- 🤖 **Nyth AI** — ask questions about your data (requires a license key).

## Install

Install Tabnyth with one database adapter:

```bash
# MongoDB
npm i -D tabnyth @tabnyth/mongodb
npx tabnyth --url "mongodb://localhost:27017/mydb"
```

```bash
# Postgres
npm i -D tabnyth @tabnyth/postgres
npx tabnyth --url "postgresql://user:pass@localhost:5432/mydb"
```

To read the database URL from a custom env file, add a script:

```json
{
  "scripts": {
    "tabnyth": "npx tabnyth .env.dev DATABASE_URL"
  }
}
```

## Choosing a mode

Running `npx tabnyth` (or `npm run tabnyth`) opens a startup prompt:

```txt
Select Tabnyth startup mode:
> View mode only - this will allow you to see data in your database
  Edit mode - this will allow you to make edits
```

Use the arrow keys to pick a mode and press Enter. The highlighted choice is shown in green.

- Pass `--mode view` or `--mode edit` to skip the prompt in scripts.
- Writes are disabled by default. Pass `--allow-write` only when you intentionally want write operations enabled.

## License setup

Unlock the full potential of Tabnyth (including Nyth AI) with a license key. Generate one at [tabnyth.cloud/docs/generate-license-key](https://tabnyth.cloud/docs/generate-license-key).

Run setup and paste your key when prompted — Tabnyth saves it to your project `.env` automatically:

```bash
npx tabnyth setup
```

```txt
Paste your Tabnyth license key here: tnk_your_license_key
Added TABNYTH_KEY to .env.
```

This writes the key to `.env`:

```dotenv
# Paste your Tabnyth license key here or get it generated from https://tabnyth.cloud/docs/generate-license-key
TABNYTH_KEY=tnk_your_license_key
```

You can also set `TABNYTH_KEY` directly as an environment variable. During local development, point the package at your backend with:

```bash
TABNYTH_API_URL=http://localhost:8080 npx tabnyth --url "postgresql://user:pass@localhost:5432/mydb"
```

## Links

- Website — [tabnyth.cloud](https://tabnyth.cloud)
- Documentation — [tabnyth.cloud/docs](https://tabnyth.cloud/docs)
- Generate a license key — [tabnyth.cloud/docs/generate-license-key](https://tabnyth.cloud/docs/generate-license-key)
