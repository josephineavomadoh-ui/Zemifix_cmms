import { Shell } from '@/src/components/layout/Shell';
import { ModulePlaceholder } from '@/src/components/ui/ModulePlaceholder';

export default function RequestsPage() {
  return (
    <Shell>
      <ModulePlaceholder
        moduleName="Maintenance Requests & Triage"
        stage="Stage 2"
        description="Public QR fault intake, internal department requests, duplicate detection, and supervisor conversion to work orders."
        keyFeatures={[
          'Quick 30-second fault report interface',
          'QR code intake simulator for guests & staff',
          'Duplicate detection by asset & location',
          'Supervisor approval & convert-to-order flow',
          'Requester notification status tracker',
        ]}
      />
    </Shell>
  );
}
