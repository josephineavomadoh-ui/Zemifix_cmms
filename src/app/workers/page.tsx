import { Shell } from '@/src/components/layout/Shell';
import { WorkerMonitoringView } from '@/src/components/workers/WorkerMonitoringView';

export default function WorkersPage() {
  return (
    <Shell>
      <WorkerMonitoringView />
    </Shell>
  );
}
