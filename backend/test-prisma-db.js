import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Testing database connection via Prisma...');
  try {
    const userCount = await prisma.user.count();
    console.log(`Successfully connected! Total users: ${userCount}`);
  } catch (error) {
    console.error('Connection Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
