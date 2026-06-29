import { ArrowRight, Users, AlertCircle } from 'lucide-react';
import type { ChampionshipDataSnapshot } from '../types/f1';

interface ConstructorsPanelProps {
  data: ChampionshipDataSnapshot | null;
  isLoading: boolean;
  selectedTeamName?: string | null;
  onTeamSelect?: (teamName: string) => void;
}

export function ConstructorsPanel({
  data,
  isLoading,
  selectedTeamName = null,
  onTeamSelect,
}: ConstructorsPanelProps) {
  const standings = data?.teamStandings || [];

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center px-4 py-12">
          <div className="animate-pulse text-xs text-cyan">Loading...</div>
        </div>
      );
    }

    if (standings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center px-4 py-12">
          <AlertCircle className="mb-2 h-5 w-5 text-white/20" />

          <p className="text-center text-xs text-white/40">
            No constructor standings available.
          </p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-white/5">
        {standings.map((standing, idx) => {
          const isSelected = selectedTeamName === standing.teamName;

          return (
            <button
              type="button"
              key={standing.teamName}
              onClick={() => onTeamSelect?.(standing.teamName)}
              disabled={!onTeamSelect}
              title={`Open ${standing.teamName} Team Performance`}
              className={`group grid w-full grid-cols-[40px_1fr_60px_60px] items-center gap-2 px-4 py-3 text-left transition-all duration-200 disabled:cursor-default ${
                isSelected
                  ? 'bg-cyan/[0.08] shadow-[inset_3px_0_0_rgba(0,212,255,0.95)]'
                  : idx === 0
                    ? 'bg-cyan/5 hover:bg-cyan/[0.08]'
                    : 'hover:bg-white/[0.035]'
              }`}
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
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="h-6 w-1 shrink-0 rounded"
                  style={{
                    backgroundColor: `#${standing.teamColour || 'ffffff'}`,
                    boxShadow: `0 0 8px #${standing.teamColour || 'ffffff'}55`,
                  }}
                />

                <div className="min-w-0">
                  <span className="block truncate text-sm text-white/80">
                    {standing.teamName}
                  </span>

                  <span
                    className={`mt-1 flex items-center gap-1 text-[8px] font-semibold tracking-[0.11em] transition-colors ${
                      isSelected
                        ? 'text-cyan'
                        : 'text-cyan/0 group-hover:text-cyan/75'
                    }`}
                  >
                    TEAM INTEL
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
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
                  : '—'}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-sm border border-white/10 bg-graphite-light/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-cyan" />

          <h2 className="text-sm font-bold tracking-[0.2em] text-white">
            CONSTRUCTORS
          </h2>
        </div>

        <span className="text-[10px] uppercase tracking-wider text-white/30">
          {standings.length > 0 ? `${standings.length} Teams` : '2026 Season'}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[40px_1fr_60px_60px] gap-2 bg-white/[0.02] px-4 py-2 text-[10px] uppercase tracking-wider text-white/40">
        <div>Pos</div>
        <div>Team</div>
        <div className="text-right">Pts</div>
        <div className="text-right">Perf</div>
      </div>

      {renderContent()}
    </div>
  );
}