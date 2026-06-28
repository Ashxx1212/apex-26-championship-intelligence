import { useState } from 'react';
import { Trophy, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { ChampionshipDataSnapshot } from '../types/f1';

interface DriverStandingsPanelProps {
  data: ChampionshipDataSnapshot | null;
  isLoading: boolean;
}

export function DriverStandingsPanel({ data, isLoading }: DriverStandingsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const standings = data?.driverStandings || [];
  const archiveStatus = data?.analyticsArchive;
  const displayStandings = expanded ? standings : standings.slice(0, 5);
  const archiveSummary = archiveStatus
    ? `${archiveStatus.successfullyIndexedRaceSessions}/${archiveStatus.totalCompletedRaceSessions} indexed rounds`
    : null;

  const renderFormBadge = (form: ('W' | 'P' | 'D' | 'R')[], index: number) => {
    const colors = {
      W: 'bg-crimson text-white',
      P: 'bg-amber text-black',
      D: 'bg-cyan text-black',
      R: 'bg-white/20 text-white/60',
    };

    return (
      <span
        key={index}
        className={`inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded ${
          colors[form] || colors.R
        }`}
      >
        {form}
      </span>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16 px-4">
          <div className="text-sm text-cyan animate-pulse">Loading standings...</div>
        </div>
      );
    }

    if (standings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <AlertCircle className="w-6 h-6 text-white/20 mb-3" />
          <p className="text-sm text-white/40 text-center">
            No driver standings available.
          </p>
          <p className="text-[10px] text-white/20 mt-1 tracking-wider uppercase">
            {archiveStatus?.hasPendingWork ? 'Archive coverage remains partial' : 'Awaiting completed races'}
          </p>
        </div>
      );
    }

    return (
      <>
        {/* Table rows */}
        <div className="divide-y divide-white/5">
          {displayStandings.map((standing, idx) => (
            <div
              key={standing.driverNumber}
              className={`
                grid grid-cols-[40px_1fr_1.2fr_60px_70px_50px] lg:grid-cols-[40px_1fr_1.2fr_60px_80px_80px_50px]
                gap-2 px-4 py-3 items-center
                transition-colors hover:bg-white/[0.02]
                ${idx === 0 ? 'bg-crimson/5' : ''}
              `}
            >
              {/* Position */}
              <div className="flex items-center gap-1">
                <span
                  className={`text-sm font-bold ${
                    standing.position <= 3
                      ? 'text-white'
                      : standing.position <= 10
                        ? 'text-white/70'
                        : 'text-white/40'
                  }`}
                >
                  {standing.position}
                </span>
                {standing.position === 1 && (
                  <span className="text-[8px] text-crimson font-bold tracking-wider">
                    LEADER
                  </span>
                )}
              </div>

              {/* Driver */}
              <div className="flex items-center gap-2">
                {/* Team colour bar */}
                <div
                  className="w-1 h-6 rounded"
                  style={{ backgroundColor: `#${standing.teamColour || 'ffffff'}` }}
                />
                {/* Acronym badge */}
                <div className="px-2 py-0.5 bg-white/10 rounded text-xs font-bold tracking-wider text-white">
                  {standing.driverAcronym}
                </div>
                <span className="text-sm text-white/70 truncate hidden md:block">
                  {standing.driverName}
                </span>
              </div>

              {/* Team */}
              <div className="text-xs text-white/50 truncate">
                {standing.teamName}
              </div>

              {/* Points */}
              <div className="text-right">
                <span className="text-sm font-bold text-cyan">
                  {standing.points}
                </span>
              </div>

              {/* Gap */}
              <div className="hidden lg:block text-right text-xs text-white/50">
                {standing.gapToLeader !== null ? `+${standing.gapToLeader}` : '—'}
              </div>

              {/* Form */}
              <div className="hidden lg:flex items-center gap-1 justify-end">
                {standing.recentForm?.length > 0
                  ? standing.recentForm.map((f, i) => renderFormBadge(f, i))
                  : <span className="text-white/30 text-xs">—</span>
                }
              </div>

              {/* Reliability */}
              <div className="hidden lg:text-right text-xs text-white/40">
                {standing.raceCompletionRate !== null
                  ? `${standing.raceCompletionRate}%`
                  : '—'
                }
              </div>
            </div>
          ))}
        </div>

        {/* Expand/collapse button */}
        {standings.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-white/40 hover:text-white/60 transition-colors border-t border-white/10"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                <span>SHOW LESS</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>SHOW FULL GRID ({standings.length - 5} MORE)</span>
              </>
            )}
          </button>
        )}
      </>
    );
  };

  return (
    <div className="bg-graphite-light/50 border border-white/10 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-crimson" />
          <h2 className="text-sm tracking-[0.2em] text-white font-bold">
            DRIVERS' STANDINGS
          </h2>
        </div>
        <span className="text-[10px] tracking-wider text-white/30 uppercase">
          {archiveSummary || (standings.length > 0 ? `${standings.length} Drivers` : '2026 Season')}
        </span>
      </div>

      {/* Table header */}
      <div className={`
        grid grid-cols-[40px_1fr_1.2fr_60px_70px_50px] lg:grid-cols-[40px_1fr_1.2fr_60px_80px_80px_50px]
        gap-2 px-4 py-2 bg-white/[0.02] text-[10px] tracking-wider text-white/40 uppercase
      `}>
        <div>Pos</div>
        <div>Driver</div>
        <div>Team</div>
        <div className="text-right">Pts</div>
        <div className="hidden lg:block text-right">Gap</div>
        <div className="hidden lg:block text-right">Form</div>
        <div className="hidden lg:block text-right">Rel</div>
      </div>

      {renderContent()}
    </div>
  );
}
