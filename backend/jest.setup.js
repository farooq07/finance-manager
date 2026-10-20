// Runs before every test file. Prisma loads backend/.env only for variables
// that are not already set, so pinning these here keeps tests off the real
// database: any query a test forgets to mock fails instead of writing data.
const UNREACHABLE_DB = 'postgresql://jest:jest@127.0.0.1:1/jest_no_db?connect_timeout=1';
process.env.DATABASE_URL = UNREACHABLE_DB;
process.env.DIRECT_URL = UNREACHABLE_DB;
