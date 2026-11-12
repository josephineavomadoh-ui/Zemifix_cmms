/**
 * Inspect Manifest Discrepancy Tool (Inspection Only)
 */

import fs from 'fs';

async function inspectDiscrepancy() {
  const manifestPath = 'C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/final_preflight_manifest.json';
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  console.log(`Total users in manifest file: ${manifest.users.length}`);
  const operationalLooking = manifest.users.filter((u: any) => !u.identifier.includes('maker.') && !u.identifier.includes('checker') && !u.identifier.includes('test') && !u.identifier.includes('foreign.') && !u.identifier.includes('imported.') && !u.identifier.includes('notification-') && !u.identifier.includes('r1') && !u.identifier.includes('d2') && !u.identifier.includes('d3') && !u.identifier.includes('d4') && !u.identifier.includes('crash.') && !u.identifier.includes('newstaff.') && !u.identifier.includes('restricted.') && !u.identifier.includes('finalstaff.') && !u.identifier.includes('conc1.'));

  console.log(`Operational staff incorrectly included in manifest users (${operationalLooking.length}):`);
  operationalLooking.forEach((u: any) => console.log(`  - ${u.identifier} (${u.id})`));
}

inspectDiscrepancy();
