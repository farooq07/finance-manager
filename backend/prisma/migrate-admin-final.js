import prisma from '../src/utils/prisma.js';

async function migrateAdminData() {
  try {
    const adminId = '4b429a91-df43-4a60-b4b6-884984d0e4ec';
    const superAdminId = 'a64a1e5f-99e0-4284-9197-d99fe5f3e0a5';

    console.log('🔄 Starting data migration...\n');

    // Define all tables that have user_id
    const tables = [
      'expenses',
      'mutual_funds',
      'stocks',
      'stock_transactions',
      'people',
      'dues_transactions',
      'rent_entries',
      'bank_investments',
      'wallets',
      'banks',
      'institutions',
      'broker_accounts',
      'zakatentries',
      'assets',
      'portfolio_snapshots',
      'psx_snapshots'
    ];

    let totalMigrated = 0;

    for (const table of tables) {
      try {
        const result = await prisma.$executeRaw`
          UPDATE ${prisma.$raw(table)}
          SET user_id = ${superAdminId}::uuid
          WHERE user_id = ${adminId}::uuid
        `;

        if (result > 0) {
          console.log(`✅ ${table}: ${result} records migrated`);
          totalMigrated += result;
        }
      } catch (error) {
        // Table might not exist or have user_id, skip silently
        console.log(`⚠️  ${table}: Skipped (table not found or no matching records)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ MIGRATION COMPLETE!`);
    console.log(`📊 Total Records Migrated: ${totalMigrated}`);
    console.log(`👤 From: admin (${adminId})`);
    console.log(`👑 To: farooqshad07@gmail.com (${superAdminId})`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAdminData();
