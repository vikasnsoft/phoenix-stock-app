import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@phoenix.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Phoenix Admin';

async function seedAdminUser() {
  console.log('🔐 Seeding admin user...');

  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL }
  });

  if (existingAdmin) {
    console.log(`✅ Admin user already exists: ${ADMIN_EMAIL}`);
    return existingAdmin;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    }
  });

  console.log(`✅ Created admin user: ${admin.email}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Role: ${admin.role}`);

  return admin;
}

async function seedDemoUser() {
  console.log('👤 Seeding demo user...');

  const demoEmail = 'demo@phoenix.local';
  const existingDemo = await prisma.user.findUnique({
    where: { email: demoEmail }
  });

  if (existingDemo) {
    console.log(`✅ Demo user already exists: ${demoEmail}`);
    return existingDemo;
  }

  const passwordHash = await bcrypt.hash('Demo@123', 10);

  const demo = await prisma.user.create({
    data: {
      email: demoEmail,
      name: 'Demo User',
      passwordHash,
      role: UserRole.FREE,
      status: UserStatus.ACTIVE,
    }
  });

  console.log(`✅ Created demo user: ${demo.email}`);
  console.log(`   Password: Demo@123`);

  return demo;
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  await seedAdminUser();
  await seedDemoUser();

  console.log('\n✨ Seed completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
