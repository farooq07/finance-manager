import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin' },
    });

    if (existingUser) {
      console.log('Admin user already exists');
      return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin',
        name: 'Admin User',
        password_hash: hashedPassword,
      },
    });

    console.log('Admin user created successfully:', adminUser);
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
