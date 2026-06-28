import { Info } from 'lucide-react';

export function MethodologyPanel() {
  return (
    <div className="bg-graphite-light/30 border border-white/10 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
        <Info className="w-4 h-4 text-cyan" />
        <h2 className="text-sm tracking-[0.15em] text-white/80 font-medium">
          FORECAST METHODOLOGY
        </h2>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-white/50 leading-relaxed">
          APEX ingests verified, completed 2026 session data from OpenF1. Its championship
          forecast engine will activate only after enough completed-season performance data
          has been modelled. Results are analytical estimates, not certainty or betting advice.
        </p>

        {/* Key points */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] text-white/40 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-green-400" />
            <span>Verified Data Only</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-amber" />
            <span>Calibration Phase</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-cyan" />
            <span>No Fabricated Values</span>
          </div>
        </div>
      </div>
    </div>
  );
}
