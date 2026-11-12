import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma';

const PORTAL_SESSION_SECRET = new TextEncoder().encode(
  process.env.PORTAL_SESSION_SECRET || process.env.SESSION_SECRET || 'test-portal-session-secret-at-least-32-chars-long'
);

export interface AuthenticatedPortalContact {
  id: string;
  customerId: string;
  name: string;
  email: string;
  isPrimaryContact: boolean;
  canViewFinancials: boolean;
  canApproveQuotes: boolean;
  canRequestWork: boolean;
}

export async function signPortalToken(contact: { id: string; customerId: string; email: string }): Promise<string> {
  return await new SignJWT({
    contactId: contact.id,
    customerId: contact.customerId,
    email: contact.email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience('zemifix:portal_session')
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(PORTAL_SESSION_SECRET);
}

export async function getCurrentPortalContact(req: NextRequest): Promise<AuthenticatedPortalContact | null> {
  const token = req.cookies.get('zemifix_portal_session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, PORTAL_SESSION_SECRET, {
      audience: 'zemifix:portal_session',
    });

    const contactId = payload.contactId as string;
    if (!contactId) return null;

    const contact = await prisma.customerContact.findUnique({
      where: { id: contactId },
    });

    if (!contact || !contact.isActive || contact.deletedAt !== null) {
      return null;
    }

    return {
      id: contact.id,
      customerId: contact.customerId,
      name: contact.name,
      email: contact.email,
      isPrimaryContact: contact.isPrimaryContact,
      canViewFinancials: contact.canViewFinancials,
      canApproveQuotes: contact.canApproveQuotes,
      canRequestWork: contact.canRequestWork,
    };
  } catch (err) {
    return null;
  }
}
