import { Zap, TrendingUp, BarChart2, AlertTriangle, Building2, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ChampionshipDataSnapshot, DriverStanding } from '../types/f1';
import { formatPosition } from '../utils/championshipMetrics';

interface FactorCardProps {
  title: string;
  icon: LucideIcon;
  value: string | number | null;
  description: string;
  dataType: 'raw' | 'derived' | 'unavailable';
}

function FactorCard({ title, icon: Icon, value, description, dataType }: FactorCardProps) {
  const hasValue = value !== null && value !== undefined;

  return (
    <div className="group relative bg-graphite-light/30 border border-white/10 rounded-sm p-4 hover:border-cyan/30 transition-all duration-300">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-cyan/5 to-transparent rounded-sm" />

      <div className="relative">
        {/* Icon */}
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-4 h-4 text-crimson" />
          <h3 className="text-[10px] tracking-[0.15em] text-white/60 uppercase">
            {title}
          </h3>
        </div>

        {/* Value */}
        <div className={`text-2xl font-bold mb-1 ${hasValue ? 'text-white' : 'text-white/20'}`}>
          {hasValue ? value : '—'}
        </div>

        {/* Description */}
        <div className="text-[10px] text-white/40 mb-2">
          {description}
        </div>

        {/* Data type indicator */}
        <div className={`text-[9px] tracking-wider uppercase ${
          dataType === 'raw'
            ? 'text-green-400/60'
            : dataType === 'derived'
              ? 'text-cyan/60'
              : 'text-amber/60'
        }`}>
          {dataType === 'raw'
            ? 'Direct from OpenF1'
            : dataType === 'derived'
              ? 'Calculated metric'
              : 'Insufficient data'}
        </div>
      </div>
    </div>
  );
}

interface ForecastEnginePanelProps {
  data: ChampionshipDataSnapshot | null;
  isLoading: boolean;
}

export function ForecastEnginePanel({ data }: ForecastEnginePanelProps) {
  const leader = data?.driverStandings?.[0];
  const teamStandings = data?.teamStandings || [];
  const driversByTeam = data?.driversByTeam || new Map();
  const raceResults = data?.raceResults || [];
  const completedRounds = data?.completedRounds || 0;

  // Calculate teammate gap
  function getTeammateGap(leader: DriverStanding | undefined): number | null {
    if (!leader || !driversByTeam) return null;

    const teamDrivers = driversByTeam.get(leader.teamName);
    if (!teamDrivers || teamDrivers.length !== 2) return null;

    const teammate = teamDrivers.find(d => d.driver_number !== leader.driverNumber);
    if (!teammate) return null;

    const driverPositions: number[] = [];
    const teammatePositions: number[] = [];

    raceResults.forEach(race => {
      const driverResult = race.driverResults.get(leader.driverNumber);
      const teammateResult = race.driverResults.get(teammate.driver_number);

      if (
        driverResult?.racePosition &&
        teammateResult?.racePosition &&
        !['dnf', 'dns', 'dsq'].includes(driverResult.raceStatus.toLowerCase()) &&
        !['dnf', 'dns', 'dsq'].includes(teammateResult.raceStatus.toLowerCase())
      ) {
        driverPositions.push(driverResult.racePosition);
        teammatePositions.push(teammateResult.racePosition);
      }
    });

    if (driverPositions.length === 0) return null;

    const totalGap = driverPositions.reduce((sum, pos, idx) => sum + (pos - teammatePositions[idx]), 0);
    return Math.round((totalGap / driverPositions.length) * 10) / 10;
  }

  // Calculate average qualifying position
  function getAvgQualifying(leader: DriverStanding | undefined): number | null {
    if (!leader) return null;

    const qualiPositions: number[] = [];
    raceResults.forEach(race => {
      const result = race.driverResults.get(leader.driverNumber);
      if (result?.qualifyingPosition) {
        qualiPositions.push(result.qualifyingPosition);
      }
    });

    if (qualiPositions.length === 0) return null;
    const sum = qualiPositions.reduce((a, b) => a + b, 0);
    return Math.round((sum / qualiPositions.length) * 10) / 10;
  }

  // Get team performance index
  function getTeamPerformanceIndex(teamName: string): number | null {
    const team = teamStandings.find(t => t.teamName === teamName);
    return team?.performanceIndex || null;
  }

  const factors: FactorCardProps[] = leader
    ? [
        {
          title: 'Points Position',
          icon: TrendingUp,
          value: formatPosition(leader.position),
          description: `Leader with ${leader.points} points`,
          dataType: 'raw',
        },
        {
          title: 'Average Qualifying',
          icon: Zap,
          value: getAvgQualifying(leader),
          description: 'Mean grid position from completed races',
          dataType: getAvgQualifying(leader) !== null ? 'derived' : 'unavailable',
        },
        {
          title: 'Average Race Finish',
          icon: BarChart2,
          value: leader.averageRaceFinish !== null
            ? formatPosition(Math.round(leader.averageRaceFinish))
            : null,
          description: 'Mean finishing position (excl. DNFs)',
          dataType: leader.averageRaceFinish !== null ? 'derived' : 'unavailable',
        },
        {
          title: 'Race Completion Rate',
          icon: AlertTriangle,
          value: leader.raceCompletionRate !== null
            ? `${leader.raceCompletionRate}%`
            : null,
          description: `Finish rate over ${completedRounds} races`,
          dataType: leader.raceCompletionRate !== null ? 'derived' : 'unavailable',
        },
        {
          title: 'Team Performance Index',
          icon: Building2,
          value: getTeamPerformanceIndex(leader.teamName),
          description: 'Constructor benchmark score (0-100)',
          dataType: getTeamPerformanceIndex(leader.teamName) !== null ? 'derived' : 'unavailable',
        },
        {
          title: 'Teammate Delta',
          icon: Users,
          value: (() => {
            const gap = getTeammateGap(leader);
            if (gap === null) return null;
            const sign = gap > 0 ? '+' : '';
            return `${sign}${gap} positions`;
          })(),
          description: 'Avg finishing position gap to teammate',
          dataType: getTeammateGap(leader) !== null ? 'derived' : 'unavailable',
        },
      ]
    : [
        {
          title: 'Points Position',
          icon: TrendingUp,
          value: null,
          description: 'Championship standings required',
          dataType: 'unavailable',
        },
        {
          title: 'Average Qualifying',
          icon: Zap,
          value: null,
          description: 'Qualifying results required',
          dataType: 'unavailable',
        },
        {
          title: 'Average Race Finish',
          icon: BarChart2,
          value: null,
          description: 'Race finish data required',
          dataType: 'unavailable',
        },
        {
          title: 'Race Completion Rate',
          icon: AlertTriangle,
          value: null,
          description: 'Race history required',
          dataType: 'unavailable',
        },
        {
          title: 'Team Performance Index',
          icon: Building2,
          value: null,
          description: 'Constructor standings required',
          dataType: 'unavailable',
        },
        {
          title: 'Teammate Delta',
          icon: Users,
          value: null,
          description: 'Team data required',
          dataType: 'unavailable',
        },
      ];

  return (
    <div className="bg-graphite-light/50 border border-white/10 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-cyan" />
          <h2 className="text-sm tracking-[0.2em] text-white font-bold">
            PERFORMANCE FACTORS
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {leader && (
            <span className="text-[10px] tracking-wider text-white/60">
              {leader.driverAcronym}
            </span>
          )}
          <span className="text-[10px] tracking-wider text-white/30 uppercase">
            Leader Analysis
          </span>
        </div>
      </div>

      {/* Factor grid */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {factors.map((factor) => (
          <FactorCard key={factor.title} {...factor} />
        ))}
      </div>
    </div>
  );
}
