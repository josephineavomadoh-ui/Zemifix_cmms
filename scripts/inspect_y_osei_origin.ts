/**
 * Focused y.osei Origin Inspection Tool (Read-Only)
 */

import { prisma } from '../src/lib/prisma';

async function inspectYOseiOrigin() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — y.osei Origin Investigation');
  console.log('=====================================================');

  const uuid = '01a1c189-8ebc-7730-8b33-6ec70b70174f';
  const user = await prisma.user.findUnique({
    where: { id: uuid },
    include: {
      role: true,
      branch: true,
      department: true,
    },
  });

  console.log('\n--- 1. User Record Details ---');
  console.log(JSON.stringify(user, null, 2));

  // Check audit logs for this user creation or actions
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { resourceId: uuid },
        { actorUserId: uuid },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\n--- 2. Audit Logs Associated with y.osei (${auditLogs.length} entries) ---`);
  auditLogs.forEach((l) => {
    console.log(`  [${l.createdAt.toISOString()}] Action: ${l.action} | Resource: ${l.resource} (${l.resourceId}) | Actor: ${l.actorUserId}`);
  });

  // Check if seed script references y.osei
  const seedContent = fs.readFileSync('prisma/seed.ts', 'utf-8');
  console.log(`\n--- 3. Seed Script Reference Check ---`);
  console.log(`  References 'y.osei' in prisma/seed.ts: ${seedContent.includes('y.osei')}`);
}

import fs from 'fs';
inspectYOseiOrigin();
