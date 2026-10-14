import { PrismaClient } from "@prisma/client";

// Client Prisma unique : en développement, le rechargement à chaud de Next.js
// recréerait sinon une connexion à chaque modification.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
