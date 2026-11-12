import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters long'),
  OTP_SECRET: z.string().min(32, 'OTP_SECRET must be at least 32 characters long'),
  PORTAL_SESSION_SECRET: z.string().min(32, 'PORTAL_SESSION_SECRET must be at least 32 characters long'),
  APPROVAL_SECRET: z.string().min(32, 'APPROVAL_SECRET must be at least 32 characters long'),
  WORKER_SECRET: z.string().min(32, 'WORKER_SECRET must be at least 32 characters long'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  RESEND_API_KEY: z.string().optional(),
  OTP_FROM_EMAIL: z.string().email().optional(),
});

export function validateEnvironment() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('[Environment] Invalid or missing environment configuration:');
    console.error(result.error.format());
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PRODUCTION_CONFIG_ERROR: Missing or invalid required environment variables.');
    }
  }
  return result.success ? result.data : process.env;
}
