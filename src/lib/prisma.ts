import { PrismaClient } from '@prisma/client';
import { instrumentPrisma } from '../performance/metrics';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  instrumentPrisma(new PrismaClient({
    log: ['error', 'warn'],
  }), 'main');

globalForPrisma.prisma = prisma;
