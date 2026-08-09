import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  await prisma.eventSettings.update({
    where: { id: 'singleton' },
    data: {
      hostingDomainPattern: '\\.zerops\\.app\\b',
      requiredConfigFile: 'zerops.yaml',
      platformDisplayName: 'Zerops'
    }
  });
  console.log('Settings reset to Zerops defaults');
}
run().then(() => process.exit(0));
