import { Shell } from '@/src/components/layout/Shell';
import { ModulePlaceholder } from '@/src/components/ui/ModulePlaceholder';

export default function SettingsPage() {
  return (
    <Shell>
      <ModulePlaceholder
        moduleName="Company & System Settings"
        stage="Stage 4"
        description="Operating mode toggles (Facility / Contractor), currency, fiscal calendar, document number prefixes, and OTP channels."
        keyFeatures={[
          'Operating mode switcher (Facility / Contractor)',
          'Currency, locale, tax schemes and timezone settings',
          'Document numbering sequences (WO-, INV-, REQ-, PO-)',
          'Session lifetime & mandatory OTP channel rules',
          'Integration endpoints (SMS, Email, Payment webhooks)',
        ]}
      />
    </Shell>
  );
}
