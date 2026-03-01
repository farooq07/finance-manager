import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'farooqibex@gmail.com';
    const name = 'farooq';
    const password = 'admin123';

    try {
        console.log(`Checking if user ${email} exists...`);

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (existingUser) {
            console.log(`User found. Updating password and username...`);
            await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    name,
                    password_hash: hashedPassword
                }
            });
            console.log(`Successfully updated admin user: ${name} (${email})`);
        } else {
            console.log(`User not found. Creating new admin user...`);
            await prisma.user.create({
                data: {
                    name,
                    email,
                    password_hash: hashedPassword
                }
            });
            console.log(`Successfully created admin user: ${name} (${email})`);
        }

    } catch (error) {
        console.error('Error seeding admin user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
