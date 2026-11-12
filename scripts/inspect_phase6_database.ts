/**
 * Stage R1 Phase 6.1 — Database Inspection & Inventory Tool
 * NON-DESTRUCTIVE: Reads table inventory, record counts, recent creations, and foreign key relationships.
 */

import { prisma } from '../src/lib/prisma';

async function inspectDatabase() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Phase 6.1 Database Inventory & Assessment');
  console.log('=====================================================');

  // 1. All Tables Inventory and Record Counts
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  console.log('\n--- 1. Complete Database Table Inventory & Record Counts ---');
  const tableCounts: Array<{ table: string; count: number }> = [];

  for (const t of tables) {
    const name = t.table_name;
    if (name === '_prisma_migrations') continue;
    try {
      const res = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT count(*) as count FROM "${name}"`);
      const cnt = Number(res[0].count);
      tableCounts.push({ table: name, count: cnt });
      console.log(`  ${name.padEnd(35)} : ${cnt}`);
    } catch (err: any) {
      console.log(`  ${name.padEnd(35)} : ERROR (${err.message})`);
    }
  }

  // 2. Investigate Recent Work Order & Asset Creation Origins
  console.log('\n--- 2. Work Order Creation Analysis (Why 104 -> 110) ---');
  const wos = await prisma.workOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: {
      id: true,
      workOrderNumber: true,
      title: true,
      type: true,
      status: true,
      createdAt: true,
      asset: { select: { assetTag: true, name: true } },
    },
  });

  wos.forEach((w) => {
    console.log(`  [${w.createdAt.toISOString()}] ${w.workOrderNumber} | ${w.type} | ${w.title.slice(0, 50)} | Asset: ${w.asset?.assetTag ?? 'None'}`);
  });

  console.log('\n--- 3. Asset Creation Analysis (Why 79 -> 81) ---');
  const assets = await prisma.asset.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: {
      id: true,
      assetTag: true,
      name: true,
      status: true,
      createdAt: true,
    },
  });

  assets.forEach((a) => {
    console.log(`  [${a.createdAt.toISOString()}] ${a.assetTag} | ${a.name} | Status: ${a.status}`);
  });

  // 4. Foreign Key Constraints Inspection
  console.log('\n--- 4. Foreign Key Constraints Inspection ---');
  const fks = await prisma.$queryRaw<Array<{ constraint_name: string; table_name: string; foreign_table_name: string; delete_rule: string }>>`
    SELECT
      tc.constraint_name,
      tc.table_name,
      ccu.table_name AS foreign_table_name,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, ccu.table_name;
  `;

  console.log(`  Total Foreign Key Constraints Identified: ${fks.length}`);
  const restrictFks = fks.filter((f) => f.delete_rule === 'RESTRICT' || f.delete_rule === 'NO ACTION');
  console.log(`  RESTRICT / NO ACTION Constraints: ${restrictFks.length}`);

  // 5. Database Triggers Inspection
  console.log('\n--- 5. Database Triggers Inspection ---');
  const triggers = await prisma.$queryRaw<Array<{ trigger_name: string; event_object_table: string; action_statement: string }>>`
    SELECT trigger_name, event_object_table, action_statement
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table;
  `;

  triggers.forEach((tr) => {
    console.log(`  Trigger '${tr.trigger_name}' on table '${tr.event_object_table}'`);
  });
}

inspectDatabase();
