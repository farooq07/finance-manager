import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const email = 'farooqibex@gmail.com';
    const user = await prisma.user.findUnique({
        where: { email }
    });
    console.log(JSON.stringify(user, null, 2));
    await prisma.$disconnect();
}

main();
