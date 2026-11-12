import type { Metadata } from 'next';
import '../index.css';
import { AuthProvider } from '@/src/lib/auth-context';
import { ApplicationFrame } from '@/src/components/layout/ApplicationFrame';

export const metadata: Metadata = {
  title: 'ZemiFix CMMS - Enterprise Maintenance & Contractor Management',
  description: 'Enterprise Computerized Maintenance Management System with dual Facility and Contractor operating modes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased font-sans">
        <AuthProvider>
          <ApplicationFrame>{children}</ApplicationFrame>
        </AuthProvider>
      </body>
    </html>
  );
}
