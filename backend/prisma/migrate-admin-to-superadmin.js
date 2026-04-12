import prisma from '../src/utils/prisma.js';

async function migrateAdminToSuperAdmin() {
  try {
    // Find admin user (farooqibex@gmail.com)
    const adminUser = await prisma.user.findUnique({
      where: { email: 'farooqibex@gmail.com' }
    });

    // Find super admin user
    const superAdminUser = await prisma.user.findUnique({
      where: { email: 'farooqshad07@gmail.com' }
    });

    if (!adminUser) {
      console.log('❌ Admin user (farooqibex@gmail.com) not found');
      return;
    }

    if (!superAdminUser) {
      console.log('❌ Super admin user (farooqshad07@gmail.com) not found');
      return;
    }

    console.log(`📋 Found admin user: ${adminUser.id}`);
    console.log(`📋 Found super admin user: ${superAdminUser.id}`);

    // Migrate all data from admin to super admin
    const tables = [
      'bank_account',
      'wallet_account',
      'broker_account',
      'completed_task',
      'investment_stock',
      'investment_fund',
      'expense',
      'income',
      'personal_transaction',
      'dues_person',
      'dues_ledger'
    ];

    console.log('\n🔄 Migrating data...\n');

    for (const table of tables) {
      try {
        const result = await prisma[table].updateMany(
          {
            where: { user_id: adminUser.id }
          },
          {
            data: { user_id: superAdminUser.id }
          }
        );
        if (result.count > 0) {
          console.log(`✅ ${table}: ${result.count} records migrated`);
        }
      } catch (error) {
        if (error.code !== 'P2025') { // P2025 = no records found
          console.log(`⚠️  ${table}: No data or table doesn't exist`);
        }
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(`\nAdmin user (${adminUser.id}) data migrated to Super Admin (${superAdminUser.id})`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAdminToSuperAdmin();
