// Integration tests run against a disposable, migrated Postgres — never the
// real database. They refuse to start unless INTEGRATION_DATABASE_URL points
// at localhost.
const url = process.env.INTEGRATION_DATABASE_URL;
if (!url) throw new Error('Set INTEGRATION_DATABASE_URL to a disposable local Postgres (see backend/integration/README.md).');
const host = new URL(url).hostname;
if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error(`Refusing to run integration tests against ${host} — local databases only.`);
}
process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-secret';
// Categorisation stays offline: keyword rules only, no AI calls.
delete process.env.GEMINI_API_KEY;
delete process.env.GROQ_API_KEY;
