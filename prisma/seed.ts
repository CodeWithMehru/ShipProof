import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash('changeme123', 12);

  const organizer = await prisma.user.upsert({
    where: { email: 'admin@shipproof.dev' },
    update: {},
    create: {
      email: 'admin@shipproof.dev',
      passwordHash,
      role: 'organizer',
    },
  });

  console.log('Seeded organizer:', organizer.email);

  // Create a demo judge account
  const judgeHash = await hash('judge123', 12);
  const judge = await prisma.user.upsert({
    where: { email: 'judge@shipproof.dev' },
    update: {},
    create: {
      email: 'judge@shipproof.dev',
      passwordHash: judgeHash,
      role: 'judge',
    },
  });

  console.log('Seeded judge:', judge.email);

  // Seed default event settings (single-row singleton)
  const eventSettings = await prisma.eventSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      eventStart: new Date('2026-08-01T00:00:00Z'),
      eventEnd: new Date('2026-08-31T23:59:59Z'),
      judgingEnd: new Date('2026-09-07T23:59:59Z'),
    },
  });

  console.log('Seeded event settings:', {
    eventStart: eventSettings.eventStart.toISOString(),
    eventEnd: eventSettings.eventEnd.toISOString(),
    judgingEnd: eventSettings.judgingEnd.toISOString(),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
