import { Shell } from '@/src/components/layout/Shell';
import { ModulePlaceholder } from '@/src/components/ui/ModulePlaceholder';

export default function PreventivePage() {
  return (
    <Shell>
      <ModulePlaceholder
        moduleName="Preventive Maintenance & Scheduling"
        stage="Stage 2"
        description="Checklist templates, recurring time and meter-based PM plans, schedule calendar, and automated idempotent generation."
        keyFeatures={[
          'Checklist template builder with pass/fail tasks',
          'PM plan creator (Time, Meter & Seasonal triggers)',
          'Interactive schedule calendar with technician workload',
          'Parts kit reservation per PM template',
          'PM compliance & missed occurrences tracking',
        ]}
      />
    </Shell>
  );
}
