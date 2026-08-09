import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  await prisma.eventSettings.update({
    where: { id: 'singleton' },
    data: {
      hostingDomainPattern: '\\.vercel\\.app\\b',
      requiredConfigFile: 'vercel.json',
      platformDisplayName: 'Vercel'
    }
  });
  console.log('Settings updated to Vercel');
  
  const sub = await prisma.submission.create({
    data: {
      projectName: 'Test Vercel Project',
      participantName: 'Tester',
      participantEmail: 'test@test.com',
      liveUrl: 'https://test-project-123.vercel.app',
      githubRepoUrl: 'https://github.com/vercel/next.js',
      demoVideoUrl: 'https://youtube.com/watch?v=123',
      status: 'pending'
    }
  });
  console.log('Submission created:', sub.id);
  
  // This row won't trigger valkey job directly because the API usually pushes to valkey. 
  // Let me just push to valkey.
}
run().then(() => process.exit(0));
