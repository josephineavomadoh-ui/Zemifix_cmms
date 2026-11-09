import { PrismaClient } from '@prisma/client';
import { generateUuidV7 } from './uuid';

/**
 * Creates an extended PrismaClient that automatically injects RFC 9562 UUIDv7
 * into the `id` field of any record created via application code if not already provided.
 * This guarantees time-ordered primary keys on high-throughput tables.
 */
function createExtendedPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/zemifix_cmms?schema=public';
  const basePrisma = new PrismaClient({
    datasourceUrl: dbUrl,
    log: [], // Suppress noisy stdout/stderr logs; errors are handled gracefully by service try/catch blocks
  });

  return basePrisma.$extends({
    name: 'uuidv7-injector',
    query: {
      $allModels: {
        async create({ model, operation, args, query }) {
          if (args.data && typeof args.data === 'object') {
            const dataObj = args.data as Record<string, unknown>;
            if (!dataObj.id) {
              dataObj.id = generateUuidV7();
            }
          }
          return query(args);
        },
        async createMany({ model, operation, args, query }) {
          if (Array.isArray(args.data)) {
            args.data = args.data.map((item) => {
              if (item && typeof item === 'object') {
                const itemObj = { ...item } as Record<string, unknown>;
                if (!itemObj.id) {
                  itemObj.id = generateUuidV7();
                }
                return itemObj;
              }
              return item;
            });
          }
          return query(args);
        },
        async upsert({ model, operation, args, query }) {
          if (args.create && typeof args.create === 'object') {
            const createObj = args.create as Record<string, unknown>;
            if (!createObj.id) {
              createObj.id = generateUuidV7();
            }
          }
          return query(args);
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createExtendedPrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma: ExtendedPrismaClient };

export const prisma: ExtendedPrismaClient =
  globalForPrisma.prisma || createExtendedPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
