import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('🔐 Resetting Super Admin password...\n');

        const superAdminEmail = 'farooqshad07@gmail.com';
        const newPassword = 'admin';

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        console.log('Hashing password with bcrypt...');
        console.log(`Salt rounds: 10`);

        // Update the user with the new hashed password
        const updated = await prisma.user.update({
            where: { email: superAdminEmail },
            data: { password_hash: hashedPassword },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                password_hash: true
            }
        });

        console.log('\n✅ Password reset successfully!');
        console.log(`\nSuperAdmin Credentials:`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Email:    ${updated.email}`);
        console.log(`Name:     ${updated.name}`);
        console.log(`Role:     ${updated.role}`);
        console.log(`Password: ${newPassword}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`\n⚠️  Change this password immediately after login!`);
        console.log(`\nPassword hash saved in DB: ${updated.password_hash.substring(0, 20)}...`);

    } catch (error) {
        console.error('❌ Error resetting password:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
