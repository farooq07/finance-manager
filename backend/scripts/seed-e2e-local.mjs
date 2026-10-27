// Create the two E2E users in the LOCAL database and print their tokens.
//
//   cd backend
//   npx cross-env DATABASE_URL=postgresql://wealthaxis:wealthaxis@127.0.0.1:54329/wealthaxis \
//     doppler run --preserve-env=DATABASE_URL -- node scripts/seed-e2e-local.mjs
//
// Prints E2E_USER_TOKEN=… and E2E_ADMIN_TOKEN=… for Playwright (pass them as
// environment variables; they take precedence over frontend/.env.test).
// Refuses to touch anything but a local database.
import jwt from 'jsonwebtoken';
import prisma from '../src/utils/prisma.js';

const host = new URL(process.env.DATABASE_URL || 'postgresql://none').hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    console.error(`Refusing: DATABASE_URL points at ${host}, not a local database.`);
    process.exit(1);
}
if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set — run through `doppler run` so tokens match the local API.');
    process.exit(1);
}

async function ensure(email, name, role) {
    const user = await prisma.user.upsert({
        where: { email },
        create: { email, name, role, password_hash: null, email_verified: true, onboarded_at: new Date() },
        update: { role, deleted_at: null, onboarded_at: new Date() },
        select: { id: true, email: true, token_version: true },
    });
    return jwt.sign({ id: user.id, email: user.email, tv: user.token_version }, process.env.JWT_SECRET, { expiresIn: '1d' });
}

const userToken = await ensure('e2e-user@wealthaxis.local', 'E2E User', 'user');
const adminToken = await ensure('e2e-admin@wealthaxis.local', 'E2E Admin', 'super.admin');
console.log(`E2E_USER_TOKEN=${userToken}`);
console.log(`E2E_ADMIN_TOKEN=${adminToken}`);
await prisma.$disconnect();
