import { Shell } from '@/src/components/layout/Shell';
import { ModulePlaceholder } from '@/src/components/ui/ModulePlaceholder';

export default function WorkOrdersPage() {
  return (
    <Shell>
      <ModulePlaceholder
        moduleName="Work Order Management"
        stage="Stage 2"
        description="Comprehensive work order lifecycle, task checklists, parts and labor costing, priority assignment, and SLA tracking."
        keyFeatures={[
          'Interactive Work Order board with status filters',
          'Work order creation modal with task checklist',
          'Slide-over detail drawer for labor, parts & expenses',
          'SLA clocks & dual-control approval indicators',
          'Printable work order sheets',
          'History log & linked tickets',
        ]}
      />
    </Shell>
  );
}
