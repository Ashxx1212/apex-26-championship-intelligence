import { BarChart3, Gauge, ShieldCheck, TimerReset } from 'lucide-react';
import type { DriverIntelSnapshot } from '../driverIntelTypes';

interface DriverIntelBreakdownProps {
  snapshot: DriverIntelSnapshot;
}

const metrics = [
  {
    label: 'Average finish',
    value: (snapshot: DriverIntelSnapshot) => snapshot.averageRaceFinish !== null ? `${snapshot.averageRaceFinish}` : '—',
    icon: BarChart3,
  },
  {
    label: 'Average quali',
    value: (snapshot: DriverIntelSnapshot) => snapshot.averageQualifyingPosition !== null ? `${snapshot.averageQualifyingPosition}` : '—',
    icon: Gauge,
  },
  {
    label: 'Completion',
    value: (snapshot: DriverIntelSnapshot) => snapshot.raceCompletionRate !== null ? `${snapshot.raceCompletionRate}%` : '—',
    icon: ShieldCheck,
  },
  {
    label: 'DNF count',
    value: (snapshot: DriverIntelSnapshot) => snapshot.dnfCount !== null ? `${snapshot.dnfCount}` : '—',
    icon: TimerReset,
  },
];

export function DriverIntelBreakdown({ snapshot }: DriverIntelBreakdownProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div key={metric.label} className="rounded-sm border border-white/10 bg-graphite-light/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/45">
              <Icon className="h-3.5 w-3.5 text-cyan" />
              {metric.label}
            </div>
            <div className="text-2xl font-bold text-white">
              {metric.value(snapshot)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
