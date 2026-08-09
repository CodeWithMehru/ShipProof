import fs from 'fs';

async function run() {
  // 1. Register organizer account to get a token
  let res = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test-admin@test.com', password: 'password', role: 'organizer' })
  });
  
  if (res.status === 400) {
    // maybe already registered, login
    res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test-admin@test.com', password: 'password' })
    });
  }
  const auth = await res.json();
  const token = auth.token;
  console.log('Got token:', !!token);

  // 2. Change event settings to Vercel
  const settingsRes = await fetch('http://localhost:3000/api/settings/event', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      eventStart: "2026-08-01T00:00:00.000Z",
      eventEnd: "2026-08-31T00:00:00.000Z",
      judgingEnd: "2026-09-07T00:00:00.000Z",
      hostingDomainPattern: "\\.vercel\\.app\\b",
      requiredConfigFile: "vercel.json",
      platformDisplayName: "Vercel"
    })
  });
  console.log('Settings updated:', await settingsRes.json());

  // Wait for worker cache TTL? The cache TTL is 5 minutes! I can just restart the worker, or I can just edit the DB.
  // The worker will not pick it up for 5 mins unless I restart it.
  
  // 3. Submit a project
  const subRes = await fetch('http://localhost:3000/api/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectName: 'Test Vercel Project',
      participantName: 'Tester',
      participantEmail: 'test@test.com',
      liveUrl: 'https://test-project-123.vercel.app',
      githubRepoUrl: 'https://github.com/vercel/next.js',
      demoVideoUrl: 'https://youtube.com/watch?v=123'
    })
  });
  const sub = await subRes.json();
  console.log('Submitted:', sub);
}

run().catch(console.error);
