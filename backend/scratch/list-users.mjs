import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();
const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, app_pin_code: true }
});
console.log(JSON.stringify(users, null, 2));
await prisma.$disconnect();
