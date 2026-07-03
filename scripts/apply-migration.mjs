// scripts/apply-migration.mjs — the ONLY sanctioned way to run SQL against
// production for this project. Mirrors the same script in syncagent-v2.
//
// Usage: node scripts/apply-migration.mjs <filename>.sql
//
// Only executes files that already exist inside supabase/migrations/,
// verbatim, no string interpolation, no eval. The SQL is always a
// reviewable, git-tracked file — never inline/generated at runtime.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "pg";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, "..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node scripts/apply-migration.mjs <filename>.sql");
  process.exit(1);
}

const filename = path.basename(arg);
if (filename !== arg || !filename.endsWith(".sql")) {
  console.error(`Refusing: "${arg}" must be a bare .sql filename, no path components.`);
  process.exit(1);
}

const filepath = path.join(MIGRATIONS_DIR, filename);
if (!fs.existsSync(filepath)) {
  console.error(`Not found: ${filepath}`);
  process.exit(1);
}

const sql = fs.readFileSync(filepath, "utf8");

const projectRef = fs.existsSync(path.join(ROOT, "supabase", ".temp", "project-ref"))
  ? fs.readFileSync(path.join(ROOT, "supabase", ".temp", "project-ref"), "utf8").trim()
  : null;
if (!projectRef) {
  console.error("Missing supabase/.temp/project-ref — is this project linked?");
  process.exit(1);
}

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Missing SUPABASE_DB_PASSWORD in environment.");
  process.exit(1);
}

console.log(`Applying ${filename} (${sql.length} chars) to Supabase project ${projectRef}...`);

const client = new Client({
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  user: "postgres",
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log(`Applied ${filename} successfully.`);
} catch (e) {
  console.error(`Migration failed: ${e.message}`);
  process.exit(1);
} finally {
  await client.end();
}
