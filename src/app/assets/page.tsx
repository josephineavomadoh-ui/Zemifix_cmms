import { Shell } from '@/src/components/layout/Shell';
import { ModulePlaceholder } from '@/src/components/ui/ModulePlaceholder';

export default function AssetsPage() {
  return (
    <Shell>
      <ModulePlaceholder
        moduleName="Assets & Equipment Management"
        stage="Stage 2"
        description="Comprehensive asset register, physical location hierarchy, meter readings, BOM (bill of materials), and equipment downtime tracking."
        keyFeatures={[
          'Searchable asset registry with category trees',
          'Asset detail view with BOM and manuals library',
          'Meter readings log & condition triggers',
          'Equipment downtime history & MTBF computation',
          'Printable QR asset tags and label sheets',
        ]}
      />
    </Shell>
  );
}
