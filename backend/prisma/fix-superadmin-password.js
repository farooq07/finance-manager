import prisma from '../src/utils/prisma.js';
import bcrypt from 'bcrypt';

async function fixPassword() {
  try {
    console.log('🔧 Updating super admin password...\n');

    const newPassword = 'admin123'; // 8 characters - meets 6 char requirement
    const hashedPassword = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));

    const updated = await prisma.user.update({
      where: { email: 'farooqshad07@gmail.com' },
      data: { password_hash: hashedPassword },
      select: { id: true, name: true, email: true }
    });

    console.log('✅ Password updated successfully!\n');
    console.log('📋 Updated User:');
    console.log(`   Email: ${updated.email}`);
    console.log(`   Name: ${updated.name}`);
    console.log('\n🔑 New Credentials:');
    console.log(`   Email: ${updated.email}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   OTP: 123456`);
    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixPassword();
