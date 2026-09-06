import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = join(scriptDirectory, '..', 'migrations');
const migrationLockKey = 746390851;
const dryRun = process.argv.slice(2).includes('--dry-run');

const migrationFiles = (await readdir(migrationsDirectory))
  .filter((file) => /^\d{3}_.+\.sql$/.test(file))
  .sort();

if (migrationFiles.length === 0) {
  throw new Error('No migration files found.');
}

if (dryRun) {
  console.log(`Migration files: ${migrationFiles.join(', ')}`);
  process.exit(0);
}

const databaseUrl = process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error('POSTGRES_URL is required to run migrations.');
}

const sql = postgres(
  databaseUrl.includes('?') ? databaseUrl : `${databaseUrl}?sslmode=require`,
  { max: 1 },
);

let locked = false;

try {
  await sql`select pg_advisory_lock(${migrationLockKey})`;
  locked = true;

  await sql`
    create table if not exists public.schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const applied = await sql`select id from public.schema_migrations`;
  const appliedIds = new Set(applied.map(({ id }) => id));

  for (const file of migrationFiles) {
    if (appliedIds.has(file)) continue;

    const source = await readFile(join(migrationsDirectory, file), 'utf8');

    await sql.begin(async (transaction) => {
      await transaction.unsafe(source).simple();
      await transaction`
        insert into public.schema_migrations (id) values (${file})
      `;
    });

    console.log(`Applied ${file}`);
  }
} finally {
  if (locked) await sql`select pg_advisory_unlock(${migrationLockKey})`;
  await sql.end({ timeout: 5 });
}
