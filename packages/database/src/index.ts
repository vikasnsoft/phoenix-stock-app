import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export { prisma };
export * from '@prisma/client';

// Utility function for safe database connection
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✓ Database connected successfully');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }
}

// Utility function for graceful shutdown
export async function disconnectDatabase() {
  await prisma.$disconnect();
  console.log('✓ Database disconnected');
}

// Transaction helper
export async function withTransaction<T>(
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn);
}
