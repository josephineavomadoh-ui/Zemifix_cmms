/**
 * Stage R1 Phase 6.1.11 — User Scope Reconciliation Tool (Inspection Only)
 * Compares original manifest vs corrected manifest and inspects the 17 auxiliary/wrongbranch accounts.
 */

import { prisma } from '../src/lib/prisma';
import fs from 'fs';

async function runScopeReconciliation() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Phase 6.1.11 User Scope Reconciliation');
  console.log('=====================================================');

  const origManifestPath = 'C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/final_preflight_manifest.json';
  const corrManifestPath = 'C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/final_preflight_manifest_corrected.json';

  const orig = JSON.parse(fs.readFileSync(origManifestPath, 'utf-8'));
  const corr = JSON.parse(fs.readFileSync(corrManifestPath, 'utf-8'));

  const origIds = new Set(orig.users.map((u: any) => u.id));
  const corrIds = new Set(corr.users.map((u: any) => u.id));

  const onlyOrig = orig.users.filter((u: any) => !corrIds.has(u.id));
  const onlyCorr = corr.users.filter((u: any) => !origIds.has(u.id));

  console.log(`\n--- 1. Set Comparison ---`);
  console.log(`  Original Manifest Users Count: ${orig.users.length}`);
  console.log(`  Corrected Manifest Users Count: ${corr.users.length}`);
  console.log(`  Only in Original Set: ${onlyOrig.length}`);
  console.log(`  Only in Corrected Set: ${onlyCorr.length}`);

  // Inspect the 17 accounts specifically (`y.osei` and 16 `wrongbranch.*`)
  const wrongBranchUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'y.osei' } },
        { email: { contains: 'wrongbranch' } },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      branch: { select: { code: true, name: true } },
      _count: {
        select: {
          auditLogs: true,
          assignedWorkOrders: true,
          supervisedWorkOrders: true,
          statusHistoryChanges: true,
          checkerApprovalActions: true,
          makerApprovalRequests: true,
        },
      },
    },
  });

  console.log(`\n--- 3. Investigation of the 17 Contradicted Accounts ---`);
  wrongBranchUsers.forEach((u) => {
    const refs = u._count.auditLogs + u._count.assignedWorkOrders + u._count.supervisedWorkOrders + u._count.statusHistoryChanges + u._count.checkerApprovalActions + u._count.makerApprovalRequests;
    console.log(`  [${u.id}] ${u.email} | Branch: ${u.branch?.code} | Refs: ${refs} | Created: ${u.createdAt.toISOString()}`);
  });
}

runScopeReconciliation();
