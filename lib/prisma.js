import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

// Only create PrismaClient if we're not in build time
const prisma = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;