import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const OLD_USER_ID = '706ed6ab-ae6e-43bb-962c-dab4d2374048';
const CORRECT_USER_ID = '06181113-8eb4-4df8-bd71-3dd86490e260';

async function main() {
    // Migrate people records from old user to the correct user
    const result = await prisma.person.updateMany({
        where: { user_id: OLD_USER_ID },
        data: { user_id: CORRECT_USER_ID }
    });
    console.log(`Migrated ${result.count} people records to correct user.`);

    // Also migrate any dues transactions
    const txResult = await prisma.duesTransaction.updateMany({
        where: { user_id: OLD_USER_ID },
        data: { user_id: CORRECT_USER_ID }
    });
    console.log(`Migrated ${txResult.count} transaction records.`);

    // Remove the duplicate "Salman Shad" — keep only one
    const salmans = await prisma.person.findMany({
        where: { user_id: CORRECT_USER_ID, name: 'Salman Shad' },
        orderBy: { created_at: 'asc' }
    });
    if (salmans.length > 1) {
        // Keep the first, delete the rest
        for (let i = 1; i < salmans.length; i++) {
            await prisma.person.delete({ where: { id: salmans[i].id } });
            console.log(`Deleted duplicate Salman Shad (id: ${salmans[i].id})`);
        }
    }

    // Verify final state
    const final = await prisma.person.findMany({
        where: { user_id: CORRECT_USER_ID },
        include: { transactions: true }
    });
    console.log('\nFinal state:');
    final.forEach(p => console.log(`  - ${p.name} (${p.id})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
