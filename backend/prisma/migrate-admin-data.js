import prisma from '../src/utils/prisma.js';

async function migrateAdminDataToSuperAdmin() {
  try {
    // Find admin user (email: "admin")
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin' }
    });

    // Find super admin user
    const superAdminUser = await prisma.user.findUnique({
      where: { email: 'farooqshad07@gmail.com' }
    });

    if (!adminUser) {
      console.log('❌ Admin user (email: admin) not found');
      return;
    }

    if (!superAdminUser) {
      console.log('❌ Super admin user (farooqshad07@gmail.com) not found');
      return;
    }

    console.log(`📋 Found admin user: ${adminUser.id} (${adminUser.email})`);
    console.log(`📋 Found super admin user: ${superAdminUser.id} (${superAdminUser.email})\n`);

    // Migrate all data from admin to super admin
    const migrations = [
      {
        model: 'expense',
        table: 'Expense'
      },
      {
        model: 'wallet',
        table: 'Wallet'
      },
      {
        model: 'bank',
        table: 'Bank'
      },
      {
        model: 'stock',
        table: 'Stock'
      },
      {
        model: 'person',
        table: 'Person'
      },
      {
        model: 'mutualFund',
        table: 'MutualFund'
      },
      {
        model: 'duesTransaction',
        table: 'DuesTransaction'
      },
      {
        model: 'rentEntry',
        table: 'RentEntry'
      },
      {
        model: 'bankInvestment',
        table: 'BankInvestment'
      },
      {
        model: 'zakat',
        table: 'Zakat'
      },
      {
        model: 'asset',
        table: 'Asset'
      }
    ];

    console.log('🔄 Migrating data...\n');
    let totalMigrated = 0;

    for (const migration of migrations) {
      try {
        const result = await prisma[migration.model].updateMany(
          {
            where: { user_id: adminUser.id }
          },
          {
            data: { user_id: superAdminUser.id }
          }
        );
        if (result.count > 0) {
          console.log(`✅ ${migration.table}: ${result.count} records migrated`);
          totalMigrated += result.count;
        }
      } catch (error) {
        // Silently skip if table doesn't exist
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Migration Complete!`);
    console.log(`📊 Total Records Migrated: ${totalMigrated}`);
    console.log(`👤 From: ${adminUser.email} (${adminUser.id})`);
    console.log(`👑 To: ${superAdminUser.email} (${superAdminUser.id})`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAdminDataToSuperAdmin();
