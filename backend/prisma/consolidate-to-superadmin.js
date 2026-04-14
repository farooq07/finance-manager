import prisma from '../src/utils/prisma.js';

async function consolidateToSuperAdmin() {
  try {
    console.log('🔧 Starting data consolidation to super admin...\n');

    // 1. Get super admin user
    const superAdmin = await prisma.user.findUnique({
      where: { email: 'farooqshad07@gmail.com' },
      select: { id: true, email: true, name: true }
    });

    if (!superAdmin) {
      console.error('❌ Super admin user not found!');
      process.exit(1);
    }

    console.log(`👑 Super Admin found: ${superAdmin.email} (${superAdmin.id})\n`);

    // 2. Get all users
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    });

    console.log(`📋 Found ${allUsers.length} total user(s):`);
    allUsers.forEach(u => {
      console.log(`   ${u.role === 'super.admin' ? '👑' : '👤'} ${u.name} (${u.email})`);
    });
    console.log();

    // 3. Get other users (not super admin)
    const otherUsers = allUsers.filter(u => u.id !== superAdmin.id);
    console.log(`🔄 Will consolidate ${otherUsers.length} other user(s) to super admin...\n`);

    // 4. Define all tables that have user_id
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
      'bank_statements',
      'institutions',
      'broker_accounts',
      'zakatentries',
      'assets',
      'portfolio_snapshots',
      'psx_snapshots'
    ];

    let totalMigrated = 0;

    // 5. Move all data from other users to super admin
    for (const table of tables) {
      try {
        // Get count of records from other users
        const countResult = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM ${prisma.$raw(table)}
          WHERE user_id != ${superAdmin.id}::uuid
        `;

        const count = Number(countResult[0]?.count || 0);

        if (count > 0) {
          // Update all records from other users to super admin
          const updateResult = await prisma.$executeRaw`
            UPDATE ${prisma.$raw(table)}
            SET user_id = ${superAdmin.id}::uuid
            WHERE user_id != ${superAdmin.id}::uuid
          `;

          console.log(`✅ ${table}: ${updateResult} records moved to super admin`);
          totalMigrated += updateResult;
        }
      } catch (error) {
        // Table might not exist or have user_id, skip silently
        console.log(`⚠️  ${table}: Skipped (table not found or no data)`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`📊 Total Records Consolidated: ${totalMigrated}`);
    console.log(`👑 All data moved to: ${superAdmin.email}`);
    console.log('='.repeat(70));

    // 6. Delete all other users
    if (otherUsers.length > 0) {
      console.log('\n🗑️  Deleting other users...\n');

      for (const user of otherUsers) {
        try {
          await prisma.user.delete({
            where: { id: user.id }
          });
          console.log(`   ✅ Deleted: ${user.name} (${user.email})`);
        } catch (error) {
          console.log(`   ❌ Failed to delete: ${user.name} - ${error.message}`);
        }
      }
    }

    // 7. Final verification
    console.log('\n' + '='.repeat(70));
    console.log('✨ CONSOLIDATION COMPLETE!\n');

    const finalUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });

    console.log('📋 Final User List:');
    finalUsers.forEach(u => {
      console.log(`   👑 ${u.name} (${u.email}) - ${u.role}`);
    });

    // Count final data
    console.log('\n📊 Final Data Summary:');
    for (const table of tables) {
      try {
        const countResult = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM ${prisma.$raw(table)}
        `;
        const count = Number(countResult[0]?.count || 0);
        if (count > 0) {
          console.log(`   ${table}: ${count} records`);
        }
      } catch (error) {
        // Skip tables that don't exist
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ All data is now owned by super admin user!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Consolidation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

consolidateToSuperAdmin();
