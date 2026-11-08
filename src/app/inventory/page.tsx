import { Shell } from '@/src/components/layout/Shell';
import { ModulePlaceholder } from '@/src/components/ui/ModulePlaceholder';

export default function InventoryPage() {
  return (
    <Shell>
      <ModulePlaceholder
        moduleName="Inventory & Spare Parts"
        stage="Stage 3"
        description="Multi-store parts register, bin locations, locked stock issuing, and append-only stock transaction ledger."
        keyFeatures={[
          'Multi-store inventory with bin management',
          'Low-stock threshold alerts & reorder points',
          'Append-only stock ledger (Receipt, Issue, Adjustment)',
          'Part reservation against active work orders',
          'Cycle counts with variance approval workflow',
        ]}
      />
    </Shell>
  );
}
