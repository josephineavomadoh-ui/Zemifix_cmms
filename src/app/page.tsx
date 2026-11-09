import { Shell } from '@/src/components/layout/Shell';
import { DashboardView } from '@/src/components/dashboard/DashboardView';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Shell>
      <DashboardView />
    </Shell>
  );
}
