
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (user) {
    console.log(`Found user: ${user.id} (${user.email})`);
  } else {
    console.log('No user found. Creating default user...');
    const newUser = await prisma.user.create({
      data: {
        email: 'default@example.com',
        name: 'Default User',
        role: 'ADMIN',
      },
    });
    console.log(`Created user: ${newUser.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
