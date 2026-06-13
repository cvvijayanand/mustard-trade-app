import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

if (!globalForPrisma.prismaGlobal) {
  globalForPrisma.prismaGlobal = new PrismaClient();
}

const prisma = globalForPrisma.prismaGlobal;

export default prisma;
