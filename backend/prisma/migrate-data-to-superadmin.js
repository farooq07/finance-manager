import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('🔄 Starting data migration...\n');

        const fromEmail = 'farooqibex@gmail.com'; // Old admin user
        const toEmail = 'farooqshad07@gmail.com'; // New super admin user

        // Find both users
        const fromUser = await prisma.user.findUnique({ where: { email: fromEmail } });
        const toUser = await prisma.user.findUnique({ where: { email: toEmail } });

        if (!fromUser || !toUser) {
            console.error('❌ Users not found');
            console.log(`From user (${fromEmail}):`, fromUser?.id);
            console.log(`To user (${toEmail}):`, toUser?.id);
            process.exit(1);
        }

        console.log(`📋 Found users:`);
        console.log(`  From: ${fromUser.name} (${fromUser.email})`);
        console.log(`  To: ${toUser.name} (${toUser.email})`);
        console.log();

        // Define all models that have user_id
        const modelsToMigrate = [
            'expense',
            'mutual_fund',
            'stock',
            'stock_transaction',
            'person',
            'dues_transaction',
            'rent_entry',
            'portfolio_snapshot',
            'psx_snapshot',
            'bank_investment',
            'wallet',
            'bank',
            'institution',
            'broker_account',
            'zakat',
            'asset'
        ];

        let totalMigrated = 0;

        // Migrate each model
        for (const model of modelsToMigrate) {
            try {
                const updateResult = await prisma[model].updateMany({
                    where: { user_id: fromUser.id },
                    data: { user_id: toUser.id }
                });

                if (updateResult.count > 0) {
                    console.log(`✅ ${model}: ${updateResult.count} record(s) migrated`);
                    totalMigrated += updateResult.count;
                }
            } catch (error) {
                console.log(`⚠️  ${model}: Could not migrate (might not have user_id field)`);
            }
        }

        console.log();
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✨ Total records migrated: ${totalMigrated}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log();

        // Show summary
        console.log('📊 Summary:');
        console.log(`  - All data from: ${fromUser.name}`);
        console.log(`  - Migrated to: ${toUser.name}`);
        console.log(`  - Timestamp: ${new Date().toLocaleString()}`);
        console.log();
        console.log('✅ Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
