import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('🔧 Setting up Super Admin user...\n');

        // 1. Check existing users
        console.log('📋 Checking existing users in database...');
        const allUsers = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                created_at: true
            },
            orderBy: { created_at: 'asc' }
        });

        console.log(`Found ${allUsers.length} user(s):`);
        allUsers.forEach((u, idx) => {
            console.log(`  ${idx + 1}. ${u.name} (${u.email}) - Role: ${u.role}`);
        });
        console.log();

        // 2. Update or create super.admin user
        const superAdminEmail = 'farooqshad07@gmail.com';
        const existingSuperAdmin = allUsers.find(u => u.email === superAdminEmail);

        if (existingSuperAdmin) {
            console.log('🔄 Updating super.admin user role...');
            const updated = await prisma.user.update({
                where: { email: superAdminEmail },
                data: { role: 'super.admin', name: 'Super Admin' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                }
            });

            console.log('✅ Super Admin user updated!');
            console.log(`   Email: ${updated.email}`);
            console.log(`   Name: ${updated.name}`);
            console.log(`   Role: ${updated.role}`);
        } else {
            console.log('➕ Creating super.admin user...');
            const hashedPassword = await bcrypt.hash('admin', await bcrypt.genSalt(10));

            const superAdmin = await prisma.user.create({
                data: {
                    name: 'Super Admin',
                    email: superAdminEmail,
                    password_hash: hashedPassword,
                    role: 'super.admin'
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                }
            });

            console.log('✅ Super Admin created successfully!');
            console.log(`   Email: ${superAdmin.email}`);
            console.log(`   Password: admin (please change this after first login)`);
            console.log(`   Role: ${superAdmin.role}`);
        }
        console.log();

        // 3. Display final state
        console.log('📊 Final user list:');
        const finalUsers = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                created_at: true
            },
            orderBy: { created_at: 'asc' }
        });

        finalUsers.forEach((u, idx) => {
            const roleEmoji = u.role === 'super.admin' ? '👑' : u.role === 'admin' ? '⭐' : '👤';
            console.log(`  ${roleEmoji} ${idx + 1}. ${u.name} (${u.email}) - ${u.role}`);
        });
        console.log();
        console.log('✨ Setup completed successfully!\n');

    } catch (error) {
        console.error('❌ Error during setup:', error.message);
        console.error('Details:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
