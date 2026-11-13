import { prisma } from '../src/lib/prisma';

async function checkCredentials() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Active Login Credentials Inspection');
  console.log('=====================================================');

  // 1. Staff Users
  const activeStaff = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: { select: { name: true } },
      branch: { select: { name: true, code: true } },
      department: { select: { name: true } },
    },
    take: 20,
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\n--- Staff Accounts (Total Active: ${activeStaff.length}) ---`);
  activeStaff.forEach((u) => {
    console.log(`  Name: ${u.name.padEnd(25)} | Email: ${u.email.padEnd(35)} | Role: ${(u.role?.name ?? 'N/A').padEnd(15)} | Branch: ${u.branch?.code ?? 'HQ'}`);
  });

  // 2. Customer Contacts (Portal Users)
  const contacts = await prisma.customerContact.findMany({
    where: { isActive: true },
    select: {
      id: true,
      email: true,
      name: true,
      customer: { select: { name: true, customerNumber: true } },
    },
    take: 10,
  });

  console.log(`\n--- Customer Portal Accounts (Total Active Contacts: ${contacts.length}) ---`);
  if (contacts.length === 0) {
    console.log('  No customer contacts currently registered in database.');
  } else {
    contacts.forEach((c) => {
      console.log(`  Name: ${c.name.padEnd(25)} | Email: ${c.email.padEnd(35)} | Customer: ${c.customer?.name}`);
    });
  }

  console.log('\n--- Default Passwords & Auth Setup ---');
  console.log('  Primary Administrator Password: javvy');
  console.log('  Seeded Staff Password:          javvy (or initial setup password)');
  console.log('  OTP Verification:               Supported with test recipient or Resend email delivery');
}

checkCredentials();
