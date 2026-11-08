import { Shell } from '@/src/components/layout/Shell';
import { ModulePlaceholder } from '@/src/components/ui/ModulePlaceholder';

export default function ReportsPage() {
  return (
    <Shell>
      <ModulePlaceholder
        moduleName="Reports & Operational Analytics"
        stage="Stage 3"
        description="Comprehensive maintenance metrics (MTTR, MTBF, Availability, Backlog age), role-specific dashboards, and export tools."
        keyFeatures={[
          'MTTR & MTBF reliability calculation tools',
          'Asset downtime & Pareto failure-code analysis',
          'Technician utilization & labor analysis',
          'Inventory valuation & stock turnover reports',
          'Export to CSV, PDF and scheduled email reports',
        ]}
      />
    </Shell>
  );
}
