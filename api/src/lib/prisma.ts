import { PrismaClient } from '@prisma/client';

// Singleton Prisma client — reused across the API service
const prisma = new PrismaClient();

export default prisma;
