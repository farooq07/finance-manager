import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting data migration...\n');

    // Get the source and destination users
    const sourceUser = await prisma.user.findUnique({
      where: { email: 'farooqibex@gmail.com' }
    });

    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin' }
    });

    if (!sourceUser) {
      console.error('Source user (farooqibex@gmail.com) not found');
      return;
    }

    if (!adminUser) {
      console.error('Admin user not found');
      return;
    }

    console.log(`Migrating data from: ${sourceUser.email} (${sourceUser.id})`);
    console.log(`Migrating to: ${adminUser.email} (${adminUser.id})\n`);

    // 1. Migrate Banks
    const banks = await prisma.bank.findMany({ where: { user_id: sourceUser.id } });
    for (const bank of banks) {
      await prisma.bank.update({
        where: { id: bank.id },
        data: { user_id: adminUser.id }
      });
    }
    console.log(`✓ Migrated ${banks.length} banks`);

    // 2. Migrate Wallets
    const wallets = await prisma.wallet.findMany({ where: { user_id: sourceUser.id } });
    for (const wallet of wallets) {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { user_id: adminUser.id }
      });
    }
    console.log(`✓ Migrated ${wallets.length} wallets`);

    // 3. Migrate Stocks (with transactions)
    const stocks = await prisma.stock.findMany({
      where: { user_id: sourceUser.id },
      include: { transactions: true }
    });
    for (const stock of stocks) {
      await prisma.stock.update({
        where: { id: stock.id },
        data: { user_id: adminUser.id }
      });
      for (const tx of stock.transactions) {
        await prisma.stockTransaction.update({
          where: { id: tx.id },
          data: { user_id: adminUser.id }
        });
      }
    }
    console.log(`✓ Migrated ${stocks.length} stocks`);

    // 4. Migrate Mutual Funds (with history)
    const mutualFunds = await prisma.mutualFund.findMany({
      where: { user_id: sourceUser.id },
      include: { history: true }
    });
    for (const mf of mutualFunds) {
      await prisma.mutualFund.update({
        where: { id: mf.id },
        data: { user_id: adminUser.id }
      });
    }
    console.log(`✓ Migrated ${mutualFunds.length} mutual funds`);

    // 5. Migrate Expenses
    const expenses = await prisma.expense.findMany({ where: { user_id: sourceUser.id } });
    for (const exp of expenses) {
      await prisma.expense.update({
        where: { id: exp.id },
        data: { user_id: adminUser.id }
      });
    }
    console.log(`✓ Migrated ${expenses.length} expenses`);

    // 6. Migrate People and Dues Transactions
    const people = await prisma.person.findMany({
      where: { user_id: sourceUser.id },
      include: { transactions: true }
    });
    for (const person of people) {
      await prisma.person.update({
        where: { id: person.id },
        data: { user_id: adminUser.id }
      });
      for (const tx of person.transactions) {
        await prisma.duesTransaction.update({
          where: { id: tx.id },
          data: { user_id: adminUser.id }
        });
      }
    }
    console.log(`✓ Migrated ${people.length} people (dues ledger)`);

    // 7. Migrate Assets
    const assets = await prisma.asset.findMany({ where: { user_id: sourceUser.id } });
    for (const asset of assets) {
      await prisma.asset.update({
        where: { id: asset.id },
        data: { user_id: adminUser.id }
      });
    }
    console.log(`✓ Migrated ${assets.length} assets`);

    // 8. Migrate Other related data
    const rentEntries = await prisma.rentEntry.findMany({ where: { user_id: sourceUser.id } });
    for (const rent of rentEntries) {
      await prisma.rentEntry.update({
        where: { id: rent.id },
        data: { user_id: adminUser.id }
      });
    }
    console.log(`✓ Migrated ${rentEntries.length} rent entries`);

    const bankInvestments = await prisma.bankInvestment.findMany({ where: { user_id: sourceUser.id } });
    for (const bi of bankInvestments) {
      await prisma.bankInvestment.update({
        where: { id: bi.id },
        data: { user_id: adminUser.id }
      });
    }
    console.log(`✓ Migrated ${bankInvestments.length} bank investments`);

    const institutions = await prisma.institution.findMany({ where: { user_id: sourceUser.id } });
    for (const inst of institutions) {
      await prisma.institution.update({
        where: { id: inst.id },
        data: { user_id: adminUser.id }
      });
    }
    console.log(`✓ Migrated ${institutions.length} institutions`);

    const brokerAccounts = await prisma.brokerAccount.findMany({ where: { user_id: sourceUser.id } });
    for (const ba of brokerAccounts) {
      await prisma.brokerAccount.update({
        where: { id: ba.id },
        data: { user_id: adminUser.id }
      });
    }
    console.log(`✓ Migrated ${brokerAccounts.length} broker accounts`);

    const zakats = await prisma.zakat.findMany({ where: { user_id: sourceUser.id } });
    for (const z of zakats) {
      await prisma.zakat.update({
        where: { id: z.id },
        data: { user_id: adminUser.id }
      });
    }
    console.log(`✓ Migrated ${zakats.length} zakat records`);

    const portfolioSnapshots = await prisma.portfolioSnapshot.findMany({ where: { user_id: sourceUser.id } });
    for (const ps of portfolioSnapshots) {
      await prisma.portfolioSnapshot.update({
        where: { id: ps.id },
        data: { user_id: adminUser.id }
      });
    }
    console.log(`✓ Migrated ${portfolioSnapshots.length} portfolio snapshots`);

    const psxSnapshots = await prisma.psxSnapshot.findMany({ where: { user_id: sourceUser.id } });
    for (const ps of psxSnapshots) {
      await prisma.psxSnapshot.update({
        where: { id: ps.id },
        data: { user_id: adminUser.id }
      });
    }
    console.log(`✓ Migrated ${psxSnapshots.length} PSX snapshots`);

    console.log('\n✅ Migration completed successfully!');
    console.log(`\nYou can now log in with:`);
    console.log(`  Email: admin`);
    console.log(`  Password: admin123`);

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
