import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();
try {
    const u = await prisma.user.findFirst({
        select: { id: true, email: true, name: true, role: true }
    });
    console.log('OK', u);
} catch (e) {
    console.log('FAIL', e.message.split('\n')[0]);
}
await prisma.$disconnect();
