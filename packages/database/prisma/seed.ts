
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: 'Admin',
        passwordHash: 'dummy',
        role: UserRole.ADMIN,
      }
    });
    console.log('Created user:', user);
  } else {
    // If we have a user but findAll fails, maybe it's not the *first* user?
    // The service uses findFirst.
    console.log('User already exists:', user);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
