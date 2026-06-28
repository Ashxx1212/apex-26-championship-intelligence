import { User2, AlertCircle } from 'lucide-react';

export function DriverIntelPanel() {
  return (
    <div className="bg-graphite-light/50 border border-white/10 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <User2 className="w-4 h-4 text-crimson" />
          <h2 className="text-sm tracking-[0.2em] text-white font-bold">
            DRIVER INTEL
          </h2>
        </div>
        <span className="text-[10px] tracking-wider text-white/30 uppercase">
          Detailed Analysis
        </span>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <AlertCircle className="w-6 h-6 text-white/20 mb-3" />
        <p className="text-sm text-white/40 text-center">
          Driver telemetry and performance metrics will be available after data sync.
        </p>
        <p className="text-[10px] text-white/20 mt-1 tracking-wider uppercase">
          Select a driver to view detailed intel
        </p>
      </div>
    </div>
  );
}
