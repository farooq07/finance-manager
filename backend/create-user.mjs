import bcrypt from 'bcrypt';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
    const email = 'farooq@example.com';
    const name = 'farooq';
    const password = 'admin123';

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            console.log('User already exists! Email: farooq@example.com, Password: admin123');
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password_hash: hashedPassword
            }
        });

        console.log('✅ User created successfully!');
        console.log(`Email: ${user.email}`);
        console.log(`Password: admin123`);
    } catch (error) {
        console.error('Error creating user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
