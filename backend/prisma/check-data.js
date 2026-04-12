import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('=== CHECKING DATABASE ===\n');

    // 1. Check all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, created_at: true }
    });
    console.log('All Users:', users);

    // 2. For each user, count their records
    for (const user of users) {
      console.log(`\n--- Data for user: ${user.email} (${user.id}) ---`);

      const banks = await prisma.bank.findMany({ where: { user_id: user.id } });
      const wallets = await prisma.wallet.findMany({ where: { user_id: user.id } });
      const stocks = await prisma.stock.findMany({ where: { user_id: user.id } });
      const mutualFunds = await prisma.mutualFund.findMany({ where: { user_id: user.id } });
      const expenses = await prisma.expense.findMany({ where: { user_id: user.id } });
      const people = await prisma.person.findMany({ where: { user_id: user.id } });
      const assets = await prisma.asset.findMany({ where: { user_id: user.id } });

      console.log(`Banks: ${banks.length}`);
      console.log(`Wallets: ${wallets.length}`);
      console.log(`Stocks: ${stocks.length}`);
      console.log(`Mutual Funds: ${mutualFunds.length}`);
      console.log(`Expenses: ${expenses.length}`);
      console.log(`People (Dues): ${people.length}`);
      console.log(`Assets: ${assets.length}`);

      if (banks.length > 0) console.log('  Banks:', banks.map(b => b.name));
      if (wallets.length > 0) console.log('  Wallets:', wallets.map(w => w.name));
      if (mutualFunds.length > 0) console.log('  Mutual Funds:', mutualFunds.map(m => m.fund_name));
      if (stocks.length > 0) console.log('  Stocks:', stocks.map(s => s.stock_symbol));
      if (people.length > 0) console.log('  People:', people.map(p => p.name));
      if (assets.length > 0) console.log('  Assets:', assets.map(a => a.name));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
