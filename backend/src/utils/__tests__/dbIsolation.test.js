import prisma from '../prisma.js';

// Prisma auto-loads backend/.env, which points at a real Supabase database.
// Tests must never reach it: an unmocked query has to fail, not write data.
describe('test database isolation', () => {
    it('points DATABASE_URL at an unreachable host under jest', () => {
        expect(process.env.DATABASE_URL).toMatch(/127\.0\.0\.1:1\//);
    });

    it('an unmocked query rejects instead of reaching a real database', async () => {
        await expect(prisma.$queryRaw`SELECT 1`).rejects.toThrow();
    }, 20000);
});
