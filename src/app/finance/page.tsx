import { Shell } from '@/src/components/layout/Shell';
import { ModulePlaceholder } from '@/src/components/ui/ModulePlaceholder';

export default function FinancePage() {
  return (
    <Shell>
      <ModulePlaceholder
        moduleName="Finance, Costing & Billing"
        stage="Stage 3"
        description="Maintenance expenditure analysis, contractor rate cards, billable line pricing, gapless invoices, and payments."
        keyFeatures={[
          'Job-to-cash workflow for contractor mode',
          'Contract rate cards (skill rates, overtime, travel)',
          'Gapless invoice numbering assigned upon approval',
          'Customer payments (cash, bank, mobile money / MoMo)',
          'Aged debtors & statements (current, 30, 60, 90+ days)',
        ]}
      />
    </Shell>
  );
}
