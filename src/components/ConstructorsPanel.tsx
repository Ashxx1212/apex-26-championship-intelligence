import { Users, AlertCircle } from 'lucide-react';
import type { ChampionshipDataSnapshot } from '../types/f1';

interface ConstructorsPanelProps {
  data: ChampionshipDataSnapshot | null;
  isLoading: boolean;
}

export function ConstructorsPanel({ data, isLoading }: ConstructorsPanelProps) {
  const standings = data?.teamStandings || [];

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12 px-4">
          <div className="text-xs text-cyan animate-pulse">Loading...</div>
        </div>
      );
    }

    if (standings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <AlertCircle className="w-5 h-5 text-white/20 mb-2" />
          <p className="text-xs text-white/40 text-center">
            No constructor standings available.
          </p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-white/5">
        {standings.map((standing, idx) => (
          <div
            key={standing.teamName}
            className={`
              grid grid-cols-[40px_1fr_60px_60px] gap-2 px-4 py-3 items-center
              transition-colors hover:bg-white/[0.02]
              ${idx === 0 ? 'bg-cyan/5' : ''}
            `}
          >
            {/* Position */}
            <span
              className={`text-sm font-bold ${
                standing.position <= 3
                  ? 'text-white'
                  : standing.position <= 5
                    ? 'text-white/70'
                    : 'text-white/40'
              }`}
            >
              {standing.position}
            </span>

            {/* Team */}
            <div className="flex items-center gap-2">
              {/* Team colour bar */}
              <div
                className="w-1 h-6 rounded"
                style={{ backgroundColor: `#${standing.teamColour || 'ffffff'}` }}
              />
              <span className="text-sm text-white/80 truncate">
                {standing.teamName}
              </span>
            </div>

            {/* Points */}
            <div className="text-right">
              <span className="text-sm font-bold text-cyan">
                {standing.points}
              </span>
            </div>

            {/* Performance Index */}
            <div className="text-right text-xs text-white/50">
              {standing.performanceIndex !== null
                ? standing.performanceIndex
                : '—'
              }
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-graphite-light/50 border border-white/10 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan" />
          <h2 className="text-sm tracking-[0.2em] text-white font-bold">
            CONSTRUCTORS
          </h2>
        </div>
        <span className="text-[10px] tracking-wider text-white/30 uppercase">
          {standings.length > 0 ? `${standings.length} Teams` : '2026 Season'}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[40px_1fr_60px_60px] gap-2 px-4 py-2 bg-white/[0.02] text-[10px] tracking-wider text-white/40 uppercase">
        <div>Pos</div>
        <div>Team</div>
        <div className="text-right">Pts</div>
        <div className="text-right">Perf</div>
      </div>

      {renderContent()}
    </div>
  );
}
