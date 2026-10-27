// Local Postgres for development — no Supabase, no real data.
//
//   npm run db:local        start it (keeps running; Ctrl+C stops it)
//   npm run dev:localdb     in a second terminal: the API against it
//
// Data lives in backend/.localdb (git-ignored) and survives restarts. Every
// start applies pending migrations. Delete .localdb to start from empty.
// pgvector isn't included, so only the AI assistant's document search is
// unavailable locally.
import EmbeddedPostgres from 'embedded-postgres';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const LOCAL_DB_URL = 'postgresql://wealthaxis:wealthaxis@127.0.0.1:54329/wealthaxis';

const dataDir = path.resolve(import.meta.dirname, '..', '.localdb');
// UTF-8 explicitly: on Windows initdb otherwise picks the system code page
// (WIN1252), which rejects Urdu text, arrows and other non-Latin characters.
const pg = new EmbeddedPostgres({
    databaseDir: dataDir, user: 'wealthaxis', password: 'wealthaxis', port: 54329, persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    console.log('[local-db] creating a new local database in .localdb …');
    await pg.initialise();
}
await pg.start();
const admin = pg.getPgClient();
await admin.connect();
const { rows } = await admin.query("SELECT pg_encoding_to_char(encoding) AS enc FROM pg_database WHERE datname = 'wealthaxis'");
if (rows.length === 0) {
    await admin.query("CREATE DATABASE wealthaxis ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'");
} else if (rows[0].enc !== 'UTF8') {
    console.warn(`[local-db] WARNING: the local database is ${rows[0].enc}, not UTF8 — non-English text will fail.`);
    console.warn('[local-db] Recreate it: stop everything, delete backend/.localdb, run npm run db:local again.');
}
await admin.end();

console.log('[local-db] applying migrations …');
execSync('npx prisma migrate deploy', {
    cwd: path.resolve(import.meta.dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: LOCAL_DB_URL, DIRECT_URL: LOCAL_DB_URL },
});

console.log(`[local-db] ready: ${LOCAL_DB_URL}`);
console.log('[local-db] now run `npm run dev:localdb` in another terminal. Ctrl+C here stops the database.');

const stop = async () => {
    await pg.stop().catch(() => {});
    process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
