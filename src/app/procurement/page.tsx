import { Shell } from '@/src/components/layout/Shell';
import { ModulePlaceholder } from '@/src/components/ui/ModulePlaceholder';

export default function ProcurementPage() {
  return (
    <Shell>
      <ModulePlaceholder
        moduleName="Procurement & Suppliers"
        stage="Stage 3"
        description="Vendor registers, purchase requisitions, tiered purchase order approvals, and goods receipt with 3-way matching."
        keyFeatures={[
          'Supplier register with performance metrics',
          'Purchase requisitions with dual-control maker-checker',
          'Purchase order generation with email/PDF dispatch',
          'Goods receipt against POs with partial delivery',
          'Vendor invoice matching (three-way match)',
        ]}
      />
    </Shell>
  );
}
