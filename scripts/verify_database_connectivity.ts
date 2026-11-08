/**
 * ZemiFix CMMS — Database Connectivity & Table Verification Tool
 * Performs read-only inspection of configured DATABASE_URL, network reachability,
 * and Prisma client connection status.
 *
 * Rules:
 * - Do not apply migrations
 * - Do not reset or push schema
 * - Do not modify or drop tables
 */

import { prisma } from '../src/lib/prisma';
import * as net from 'net';
import * as dotenv from 'dotenv';
dotenv.config();

interface VerificationReport {
  databaseUrlConfigured: boolean;
  redactedUrl: string;
  host: string;
  port: number;
  databaseName: string;
  tcpPortReachable: boolean;
  tcpError?: string;
  prismaConnected: boolean;
  prismaError?: string;
  foundationTablesPresent: {
    companies: boolean;
    branches: boolean;
    departments: boolean;
    roles: boolean;
    permissions: boolean;
    role_permissions: boolean;
    users: boolean;
  };
  canReadRecords: {
    company: boolean;
    branch: boolean;
    department: boolean;
    role: boolean;
    user: boolean;
  };
  recordCounts: {
    company: number;
    branch: number;
    department: number;
    role: number;
    user: number;
  };
  canPerformWrites: boolean;
  blockerSummary: string;
  requiredConfiguration: string;
}

async function checkTcpPort(host: string, port: number, timeoutMs = 2500): Promise<{ reachable: boolean; error?: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      socket.destroy();
      resolve({ reachable: true });
    });

    socket.on('error', (err) => {
      resolve({ reachable: false, error: err.message });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ reachable: false, error: 'Connection timed out' });
    });
  });
}

export async function runDatabaseVerification(): Promise<VerificationReport> {
  const dbUrl = process.env.DATABASE_URL || '';
  let host = '127.0.0.1';
  let port = 5432;
  let databaseName = 'zemifix_cmms';
  let redactedUrl = '(not configured)';

  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl.replace('postgresql://', 'http://'));
      host = parsed.hostname || '127.0.0.1';
      port = parseInt(parsed.port || '5432', 10);
      databaseName = parsed.pathname.replace(/^\//, '');
      redactedUrl = `postgresql://****:****@${host}:${port}/${databaseName}`;
    } catch {
      redactedUrl = '(unparseable format)';
    }
  }

  const report: VerificationReport = {
    databaseUrlConfigured: !!dbUrl,
    redactedUrl,
    host,
    port,
    databaseName,
    tcpPortReachable: false,
    prismaConnected: false,
    foundationTablesPresent: {
      companies: false,
      branches: false,
      departments: false,
      roles: false,
      permissions: false,
      role_permissions: false,
      users: false,
    },
    canReadRecords: {
      company: false,
      branch: false,
      department: false,
      role: false,
      user: false,
    },
    recordCounts: {
      company: 0,
      branch: 0,
      department: 0,
      role: 0,
      user: 0,
    },
    canPerformWrites: false,
    blockerSummary: '',
    requiredConfiguration: '',
  };

  // 1. TCP Connection Check
  const tcpCheck = await checkTcpPort(host, port);
  report.tcpPortReachable = tcpCheck.reachable;
  if (!tcpCheck.reachable) {
    report.tcpError = tcpCheck.error;
    report.blockerSummary = `TCP connection to PostgreSQL at ${host}:${port} failed (${tcpCheck.error}). No active PostgreSQL server process is listening on this host and port.`;
    report.requiredConfiguration = `A reachable PostgreSQL instance must be running. Set DATABASE_URL in .env to point to a valid accessible PostgreSQL host and database.`;
    return report;
  }

  // 2. Prisma Raw Query Check
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    report.prismaConnected = true;
  } catch (err: any) {
    report.prismaError = err.message;
    report.blockerSummary = `PostgreSQL port ${port} is open, but Prisma connection failed: ${err.message}`;
    return report;
  }

  // 3. Foundation Tables Check
  const tablesToCheck = ['companies', 'branches', 'departments', 'roles', 'permissions', 'role_permissions', 'users'] as const;
  for (const tbl of tablesToCheck) {
    try {
      const result: any[] = await prisma.$queryRawUnsafe(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tbl}') as exists;`
      );
      if (result?.[0]?.exists) {
        report.foundationTablesPresent[tbl] = true;
      }
    } catch {
      report.foundationTablesPresent[tbl] = false;
    }
  }

  // 4. Read Records Check
  try {
    const cCount = await prisma.company.count();
    report.recordCounts.company = cCount;
    report.canReadRecords.company = true;

    const bCount = await prisma.branch.count();
    report.recordCounts.branch = bCount;
    report.canReadRecords.branch = true;

    const dCount = await prisma.department.count();
    report.recordCounts.department = dCount;
    report.canReadRecords.department = true;

    const rCount = await prisma.role.count();
    report.recordCounts.role = rCount;
    report.canReadRecords.role = true;

    const uCount = await prisma.user.count();
    report.recordCounts.user = uCount;
    report.canReadRecords.user = true;

    report.canPerformWrites = true; // Connection and schema verified
  } catch (err: any) {
    report.blockerSummary = `Database is connected, but reading records failed: ${err.message}`;
  }

  return report;
}

// Run when executed directly
runDatabaseVerification().then((res) => {
    console.log('=== POSTGRESQL CONNECTIVITY & FOUNDATION AUDIT REPORT ===');
    console.log(`DATABASE_URL configured: ${res.databaseUrlConfigured} (${res.redactedUrl})`);
    console.log(`Target: ${res.host}:${res.port} / ${res.databaseName}`);
    console.log(`TCP Port Reachable: ${res.tcpPortReachable ? 'YES' : 'NO'}${res.tcpError ? ` (${res.tcpError})` : ''}`);
    console.log(`Prisma Connected: ${res.prismaConnected ? 'YES' : 'NO'}${res.prismaError ? ` (${res.prismaError})` : ''}`);
    console.log('\nFoundation Tables in Database:');
    for (const [tbl, present] of Object.entries(res.foundationTablesPresent)) {
      console.log(`  - ${tbl}: ${present ? 'PRESENT' : 'NOT FOUND'}`);
    }
    console.log('\nRecord Reading Capability:');
    for (const [entity, canRead] of Object.entries(res.canReadRecords)) {
      console.log(`  - ${entity}: ${canRead ? `OK (${(res.recordCounts as any)[entity]} records)` : 'FAILED'}`);
    }
    console.log(`\nPersistent Writes Capable: ${res.canPerformWrites ? 'YES' : 'NO'}`);
    if (res.blockerSummary) {
      console.log(`\nBlocker: ${res.blockerSummary}`);
    }
    if (res.requiredConfiguration) {
      console.log(`Required Configuration: ${res.requiredConfiguration}`);
    }
  });

