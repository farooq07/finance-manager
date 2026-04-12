import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const adminEmail = 'farooqibex@gmail.com';

        const user = await prisma.user.update({
            where: { email: adminEmail },
            data: { role: 'admin' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        });

        console.log('✅ Admin role set successfully!');
        console.log('User:', user);
    } catch (error) {
        console.error('❌ Error setting admin role:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
