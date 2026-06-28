import {
  Activity,
  ChevronRight,
  CircleDot,
  Database,
  Flag,
  Layers3,
  X,
} from 'lucide-react';
import type { ChampionshipDataSnapshot } from '../types/f1';

interface ActiveContextDockProps {
  data: ChampionshipDataSnapshot | null;
  selectedDriverNumber: number | null;
  selectedTeamName: string | null;
  selectedMeetingKey: number | null;
  isFromCache: boolean;
  isPublicAccessRestricted: boolean;
  onNavigate: (section: string) => void;
  onClearContext: () => void;
}

export function ActiveContextDock({
  data,
  selectedDriverNumber,
  selectedTeamName,
  selectedMeetingKey,
  isFromCache,
  isPublicAccessRestricted,
  onNavigate,
  onClearContext,
}: ActiveContextDockProps) {
  const selectedDriver = selectedDriverNumber
    ? data?.driverStandings.find(
        (driver) => driver.driverNumber === selectedDriverNumber
      ) ?? null
    : null;

  const selectedMeeting =
    (selectedMeetingKey
      ? data?.raceWeekends.find(
          (weekend) => weekend.meetingKey === selectedMeetingKey
        )
      : null) ??
    data?.raceWeekends.find(
      (weekend) =>
        weekend.meetingKey ===
        (data?.currentMeeting?.meeting_key ??
          data?.nextUpcomingMeeting?.meeting_key ??
          data?.latestCompletedMeeting?.meeting_key)
    ) ??
    null;

  const teamFocus = selectedTeamName ?? selectedDriver?.teamName ?? null;
  const explicitFocus =
    selectedDriverNumber !== null ||
    selectedTeamName !== null ||
    selectedMeetingKey !== null;

  const dataMode = isPublicAccessRestricted
    ? 'ARCHIVE / SOURCE PAUSED'
    : isFromCache
      ? 'VERIFIED ARCHIVE'
      : 'VERIFIED SOURCE';

  return (
    <section className="relative overflow-hidden border border-cyan/20 bg-[#081015]/88 shadow-[0_12px_35px_rgba(0,0,0,0.20)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_110%,rgba(0,212,255,0.08),transparent_30%),radial-gradient(circle_at_82%_0%,rgba(220,20,60,0.055),transparent_26%)]" />

      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.09] px-4 py-3">
        <div className="flex items-center gap-2">
          <CircleDot className="h-4 w-4 text-cyan" />
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-white uppercase">
              Active Intelligence Context
            </p>
            <p className="mt-0.5 text-[8px] tracking-[0.14em] text-white/35 uppercase">
              Selections persist across Race Operations modules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`border px-2 py-1 text-[8px] font-semibold tracking-[0.13em] ${
              isPublicAccessRestricted
                ? 'border-amber/30 bg-amber/[0.06] text-amber'
                : isFromCache
                  ? 'border-green-400/25 bg-green-400/[0.04] text-green-400'
                  : 'border-cyan/25 bg-cyan/[0.04] text-cyan'
            }`}
          >
            {dataMode}
          </span>

          <button
            type="button"
            onClick={onClearContext}
            disabled={!explicitFocus}
            title="Clear selected driver, team, and event"
            className="inline-flex items-center gap-1.5 border border-white/10 px-2 py-1 text-[8px] tracking-[0.12em] text-white/45 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            <X className="h-3 w-3" />
            CLEAR
          </button>
        </div>
      </div>

      <div className="relative grid grid-cols-1 gap-px bg-white/[0.08] md:grid-cols-4">
        <div className="min-w-0 bg-[#091015] px-4 py-3">
          <div className="flex items-center gap-2">
            <Flag className="h-3.5 w-3.5 text-amber" />
            <p className="text-[8px] tracking-[0.14em] text-white/35 uppercase">
              Weekend Context
            </p>
          </div>
          <p className="mt-2 truncate text-[11px] font-bold tracking-[0.04em] text-white">
            {selectedMeeting?.meetingName || 'Season context pending'}
          </p>
          <p className="mt-1 text-[9px] text-white/40">
            {selectedMeeting
              ? `${selectedMeeting.circuitShortName} · ${selectedMeeting.country}`
              : 'No verified calendar selection'}
          </p>
        </div>

        <div className="min-w-0 bg-[#091015] px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-cyan" />
            <p className="text-[8px] tracking-[0.14em] text-white/35 uppercase">
              Driver Focus
            </p>
          </div>
          <p className="mt-2 truncate text-[11px] font-bold tracking-[0.04em] text-white">
            {selectedDriver
              ? `${selectedDriver.driverAcronym} · ${selectedDriver.driverName}`
              : 'No driver selected'}
          </p>
          <p className="mt-1 text-[9px] text-white/40">
            {selectedDriver
              ? `P${selectedDriver.position} · ${selectedDriver.points} pts`
              : 'Select a timing or grid signal'}
          </p>
        </div>

        <div className="min-w-0 bg-[#091015] px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers3 className="h-3.5 w-3.5 text-crimson" />
            <p className="text-[8px] tracking-[0.14em] text-white/35 uppercase">
              Team Focus
            </p>
          </div>
          <p className="mt-2 truncate text-[11px] font-bold tracking-[0.04em] text-white">
            {teamFocus || 'No team selected'}
          </p>
          <p className="mt-1 text-[9px] text-white/40">
            {teamFocus
              ? 'Shared across team and scenario modules'
              : 'Select a constructor or driver'}
          </p>
        </div>

        <div className="min-w-0 bg-[#091015] px-4 py-3">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-green-400" />
            <p className="text-[8px] tracking-[0.14em] text-white/35 uppercase">
              Data Discipline
            </p>
          </div>
          <p
            className={`mt-2 truncate text-[11px] font-bold tracking-[0.04em] ${
              isPublicAccessRestricted
                ? 'text-amber'
                : isFromCache
                  ? 'text-green-400'
                  : 'text-cyan'
            }`}
          >
            {dataMode}
          </p>
          <p className="mt-1 text-[9px] text-white/40">
            {isPublicAccessRestricted
              ? 'Fresh source requests are temporarily paused'
              : 'Context uses verified application data only'}
          </p>
        </div>
      </div>

      <div className="relative flex flex-wrap gap-2 border-t border-white/[0.09] bg-black/[0.16] px-4 py-3">
        <button
          type="button"
          disabled={!selectedDriver}
          onClick={() => onNavigate('driver-intel')}
          className="inline-flex items-center gap-1.5 border border-cyan/30 px-3 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-cyan transition-colors hover:bg-cyan/[0.08] disabled:cursor-not-allowed disabled:opacity-35"
        >
          OPEN DRIVER INTEL <ChevronRight className="h-3 w-3" />
        </button>

        <button
          type="button"
          disabled={!teamFocus}
          onClick={() => onNavigate('team')}
          className="inline-flex items-center gap-1.5 border border-crimson/30 px-3 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-crimson transition-colors hover:bg-crimson/[0.08] disabled:cursor-not-allowed disabled:opacity-35"
        >
          OPEN TEAM PERFORMANCE <ChevronRight className="h-3 w-3" />
        </button>

        <button
          type="button"
          disabled={!selectedMeeting}
          onClick={() => onNavigate('circuit')}
          className="inline-flex items-center gap-1.5 border border-amber/30 px-3 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-amber transition-colors hover:bg-amber/[0.08] disabled:cursor-not-allowed disabled:opacity-35"
        >
          OPEN CIRCUIT MATRIX <ChevronRight className="h-3 w-3" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('scenario')}
          className="inline-flex items-center gap-1.5 border border-green-400/30 px-3 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-green-400 transition-colors hover:bg-green-400/[0.08]"
        >
          OPEN SCENARIO LAB <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </section>
  );
}
