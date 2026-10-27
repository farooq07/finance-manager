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
const pg = new EmbeddedPostgres({ databaseDir: dataDir, user: 'wealthaxis', password: 'wealthaxis', port: 54329, persistent: true });

if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    console.log('[local-db] creating a new local database in .localdb …');
    await pg.initialise();
}
await pg.start();
try { await pg.createDatabase('wealthaxis'); } catch { /* already there */ }

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
