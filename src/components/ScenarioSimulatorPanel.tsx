import { FlaskConical, AlertCircle } from 'lucide-react';

export function ScenarioSimulatorPanel() {
  return (
    <div className="bg-graphite-light/50 border border-white/10 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-cyan" />
          <h2 className="text-sm tracking-[0.2em] text-white font-bold">
            SCENARIO LAB
          </h2>
        </div>
        <span className="text-[10px] tracking-wider text-white/30 uppercase">
          What-If Analysis
        </span>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <AlertCircle className="w-5 h-5 text-white/20 mb-2" />
        <p className="text-xs text-white/40 text-center">
          Run Monte Carlo simulations after verified data ingestion.
        </p>
        <p className="text-[10px] text-cyan/50 mt-2 tracking-wider">
          Requires active forecast model
        </p>
      </div>
    </div>
  );
}
