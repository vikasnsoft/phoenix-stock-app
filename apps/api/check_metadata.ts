
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sectorCount = await prisma.symbol.count({ where: { sector: { not: null } } });
  const industryCount = await prisma.symbol.count({ where: { industry: { not: null } } });

  console.log(`With Sector: ${sectorCount}`);
  console.log(`With Industry: ${industryCount}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
