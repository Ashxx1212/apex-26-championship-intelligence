import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Database,
  FlaskConical,
  Gauge,
  MapPin,
  ShieldCheck,
  Target,
  Trophy,
  Users,
} from 'lucide-react';

import type { ChampionshipDataSnapshot } from '../types/f1';
import type {
  ScenarioDataState,
  ScenarioFactorScore,
} from '../features/scenarioLab/scenarioLabTypes';
import { buildScenarioLabSnapshot } from '../features/scenarioLab/scenarioLabEngine';

interface ScenarioSimulatorPanelProps {
  data?: ChampionshipDataSnapshot | null;
  selectedDriverNumber?: number | null;
  selectedTeamName?: string | null;
  selectedMeetingKey?: number | null;
}

function getReadinessLabel(
  readiness: 'INSUFFICIENT_DATA' | 'PARTIAL_ARCHIVE' | 'MODEL_READY'
): string {
  if (readiness === 'MODEL_READY') return 'MODEL READY';
  if (readiness === 'PARTIAL_ARCHIVE') return 'PARTIAL ARCHIVE';
  return 'INSUFFICIENT DATA';
}

function getReadinessClasses(
  readiness: 'INSUFFICIENT_DATA' | 'PARTIAL_ARCHIVE' | 'MODEL_READY'
): string {
  if (readiness === 'MODEL_READY') {
    return 'border-green-400/30 bg-green-400/10 text-green-300';
  }

  if (readiness === 'PARTIAL_ARCHIVE') {
    return 'border-amber/30 bg-amber/10 text-amber';
  }

  return 'border-white/10 bg-white/5 text-white/40';
}

function getDataStateClasses(dataState: ScenarioDataState): string {
  if (dataState === 'verified') return 'text-green-400/80';
  if (dataState === 'calculated') return 'text-cyan/80';
  return 'text-amber/80';
}

function getDataStateLabel(dataState: ScenarioDataState): string {
  if (dataState === 'verified') return 'Verified input';
  if (dataState === 'calculated') return 'Calculated metric';
  return 'Unavailable';
}

function getFactorBarClasses(factor: ScenarioFactorScore): string {
  if (factor.dataState === 'unavailable') return 'bg-white/10';
  if (factor.id === 'championshipPosition') return 'bg-crimson';
  if (factor.id === 'reliability') return 'bg-green-400';
  return 'bg-cyan';
}

function formatIndex(value: number | null): string {
  if (value === null) return '—';
  return value.toFixed(1);
}

export function ScenarioSimulatorPanel({
  data = null,
  selectedDriverNumber = null,
  selectedTeamName = null,
  selectedMeetingKey = null,
}: ScenarioSimulatorPanelProps) {
  const scenarioSnapshot = buildScenarioLabSnapshot(data);

  const [localSelectedDriverNumber, setLocalSelectedDriverNumber] = useState<
    number | null
  >(null);

  const contextDriver = useMemo(
    () =>
      selectedDriverNumber !== null
        ? data?.driverStandings.find(
            (driver) => driver.driverNumber === selectedDriverNumber
          ) ?? null
        : null,
    [data, selectedDriverNumber]
  );

  const selectedWeekend = useMemo(
    () =>
      selectedMeetingKey !== null
        ? data?.raceWeekends.find(
            (weekend) => weekend.meetingKey === selectedMeetingKey
          ) ?? null
        : data?.raceWeekends.find((weekend) => weekend.status === 'active') ??
          data?.raceWeekends[0] ??
          null,
    [data, selectedMeetingKey]
  );

  const preferredContender = useMemo(() => {
    if (selectedDriverNumber !== null) {
      const directDriver = scenarioSnapshot.contenders.find(
        (contender) => contender.driverNumber === selectedDriverNumber
      );

      if (directDriver) return directDriver;
    }

    if (selectedTeamName) {
      const teamDriver = scenarioSnapshot.contenders.find(
        (contender) => contender.teamName === selectedTeamName
      );

      if (teamDriver) return teamDriver;
    }

    return null;
  }, [
    scenarioSnapshot.contenders,
    selectedDriverNumber,
    selectedTeamName,
  ]);

  const preferredContenderDriverNumber =
    preferredContender?.driverNumber ?? null;

  useEffect(() => {
    if (preferredContenderDriverNumber !== null) {
      setLocalSelectedDriverNumber(preferredContenderDriverNumber);
    }
  }, [preferredContenderDriverNumber]);

  const selectedContender =
    scenarioSnapshot.contenders.find(
      (contender) => contender.driverNumber === localSelectedDriverNumber
    ) ??
    preferredContender ??
    scenarioSnapshot.contenders[0] ??
    null;

  const isInsufficient =
    scenarioSnapshot.readiness === 'INSUFFICIENT_DATA';

  const fallbackCandidates = data?.driverStandings.slice(0, 5) ?? [];

  const selectedFallbackCandidate =
    fallbackCandidates.find(
      (driver) => driver.driverNumber === localSelectedDriverNumber
    ) ??
    fallbackCandidates.find(
      (driver) => driver.driverNumber === selectedDriverNumber
    ) ??
    fallbackCandidates[0] ??
    null;

  const contextLabel =
    contextDriver?.driverAcronym ||
    selectedContender?.driverAcronym ||
    'No driver focus';

  const teamLabel =
    selectedTeamName ||
    contextDriver?.teamName ||
    selectedContender?.teamName ||
    'No team focus';

  return (
    <section className="overflow-hidden rounded-sm border border-white/10 bg-graphite-light/50">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-cyan" />
          <div>
            <h2 className="text-sm font-bold tracking-[0.2em] text-white">
              SCENARIO LAB
            </h2>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-white/35">
              Transparent contender model
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.14em] text-white/35">
            Context-seeded evaluation
          </span>

          <span
            className={`rounded-sm border px-2 py-1 text-[9px] uppercase tracking-[0.12em] ${getReadinessClasses(
              scenarioSnapshot.readiness
            )}`}
          >
            {getReadinessLabel(scenarioSnapshot.readiness)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px border-b border-white/[0.08] bg-white/[0.08] md:grid-cols-4">
        <div className="min-w-0 bg-[#111318] px-4 py-3">
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-cyan" />
            <p className="text-[8px] uppercase tracking-[0.14em] text-white/35">
              Driver Seed
            </p>
          </div>
          <p className="mt-2 truncate text-[11px] font-bold text-white">
            {contextLabel}
          </p>
          <p className="mt-1 text-[9px] text-white/40">
            {contextDriver
              ? `${contextDriver.driverName} · P${contextDriver.position}`
              : 'Current contender view'}
          </p>
        </div>

        <div className="min-w-0 bg-[#111318] px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-crimson" />
            <p className="text-[8px] uppercase tracking-[0.14em] text-white/35">
              Team Alignment
            </p>
          </div>
          <p className="mt-2 truncate text-[11px] font-bold text-white">
            {teamLabel}
          </p>
          <p className="mt-1 text-[9px] text-white/40">
            Shared from the active intelligence context
          </p>
        </div>

        <div className="min-w-0 bg-[#111318] px-4 py-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-amber" />
            <p className="text-[8px] uppercase tracking-[0.14em] text-white/35">
              Weekend Window
            </p>
          </div>
          <p className="mt-2 truncate text-[11px] font-bold text-white">
            {selectedWeekend?.meetingName || 'Calendar context pending'}
          </p>
          <p className="mt-1 text-[9px] text-white/40">
            {selectedWeekend
              ? `${selectedWeekend.circuitShortName} · ${selectedWeekend.status}`
              : 'No event selection'}
          </p>
        </div>

        <div className="min-w-0 bg-[#111318] px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
            <p className="text-[8px] uppercase tracking-[0.14em] text-white/35">
              Model Discipline
            </p>
          </div>
          <p className="mt-2 truncate text-[11px] font-bold text-green-400">
            VERIFIED INPUTS
          </p>
          <p className="mt-1 text-[9px] text-white/40">
            No session outcome is predicted or fabricated
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan" />

          <div>
            <p className="text-xs font-medium tracking-wide text-white">
              TITLE PATH INDEX
            </p>

            <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-white/45">
              {scenarioSnapshot.disclaimer}
            </p>
          </div>
        </div>

        <div className="grid min-w-[230px] grid-cols-2 gap-2">
          <div className="border border-white/10 bg-black/20 px-3 py-2">
            <div className="flex items-center gap-1.5 text-white/35">
              <Database className="h-3 w-3" />
              <span className="text-[9px] uppercase tracking-wider">
                Archive
              </span>
            </div>

            <p className="mt-1 text-sm font-bold text-cyan">
              {scenarioSnapshot.coverage.indexedRaceResults}/
              {scenarioSnapshot.coverage.completedRounds}
            </p>

            <p className="text-[9px] text-white/35">races indexed</p>
          </div>

          <div className="border border-white/10 bg-black/20 px-3 py-2">
            <div className="flex items-center gap-1.5 text-white/35">
              <Activity className="h-3 w-3" />
              <span className="text-[9px] uppercase tracking-wider">
                Remaining
              </span>
            </div>

            <p className="mt-1 text-sm font-bold text-white">
              {scenarioSnapshot.coverage.remainingRounds}
            </p>

            <p className="text-[9px] text-white/35">rounds ahead</p>
          </div>
        </div>
      </div>

      {isInsufficient ? (
        <div className="space-y-5 px-4 py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="mb-3 h-6 w-6 text-amber/70" />

            <p className="text-sm text-white/70">
              Scenario Lab is awaiting enough verified race-result coverage.
            </p>

            <p className="mt-2 max-w-md text-[10px] leading-relaxed text-white/35">
              The Title Path Index is paused until sufficient archive coverage
              is available. You can still select a contender focus below; APEX
              will carry that selection as the model becomes ready.
            </p>
          </div>

          <div className="border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-crimson" />
                <h3 className="text-[11px] uppercase tracking-[0.18em] text-white/80">
                  Title Contender Focus
                </h3>
              </div>

              <span className="text-[9px] uppercase tracking-wider text-amber">
                INDEX PAUSED · VERIFIED STANDINGS ONLY
              </span>
            </div>

            {fallbackCandidates.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
                {fallbackCandidates.map((driver) => {
                  const isSelected =
                    selectedFallbackCandidate?.driverNumber ===
                    driver.driverNumber;

                  return (
                    <button
                      key={driver.driverNumber}
                      type="button"
                      onClick={() =>
                        setLocalSelectedDriverNumber(driver.driverNumber)
                      }
                      className={`border p-3 text-left transition-all duration-200 ${
                        isSelected
                          ? 'border-cyan/60 bg-cyan/5'
                          : 'border-white/10 bg-graphite-light/30 hover:border-cyan/25'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                            P{driver.position} · {driver.driverAcronym}
                          </p>
                          <p className="mt-2 truncate text-xs font-semibold text-white">
                            {driver.driverName}
                          </p>
                          <p className="mt-1 truncate text-[10px] text-white/40">
                            {driver.teamName}
                          </p>
                        </div>

                        {isSelected && (
                          <span className="border border-cyan/25 bg-cyan/[0.05] px-1.5 py-1 text-[8px] font-semibold tracking-[0.12em] text-cyan">
                            FOCUS
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
                        <span className="text-[10px] text-white/55">
                          {driver.points} pts
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.12em] text-white/30">
                          Verified standing
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-[10px] tracking-[0.12em] text-white/35">
                VERIFIED DRIVER STANDINGS ARE AWAITING INGESTION
              </p>
            )}

            {selectedFallbackCandidate && (
              <div className="mt-4 border border-cyan/20 bg-cyan/[0.03] p-3">
                <p className="text-[9px] uppercase tracking-[0.16em] text-cyan">
                  Selected Contender Context
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {selectedFallbackCandidate.driverName} ·{' '}
                  {selectedFallbackCandidate.teamName}
                </p>
                <p className="mt-1 text-[10px] text-white/45">
                  P{selectedFallbackCandidate.position} ·{' '}
                  {selectedFallbackCandidate.points} points · awaiting enough
                  archive coverage for a calculated Title Path Index.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-crimson" />
                <h3 className="text-[11px] uppercase tracking-[0.18em] text-white/80">
                  Title Contenders
                </h3>
              </div>

              <span className="text-[9px] uppercase tracking-wider text-white/30">
                Top {scenarioSnapshot.contenders.length} by current points
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
              {scenarioSnapshot.contenders.map((contender) => {
                const isSelected =
                  selectedContender?.driverNumber === contender.driverNumber;
                const isContextDriver =
                  selectedDriverNumber === contender.driverNumber;

                return (
                  <button
                    key={contender.driverNumber}
                    type="button"
                    onClick={() =>
                      setLocalSelectedDriverNumber(contender.driverNumber)
                    }
                    className={`border p-3 text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-cyan/60 bg-cyan/5'
                        : 'border-white/10 bg-black/20 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            P{contender.currentPosition}
                          </span>
                          <span className="text-[10px] text-white/50">
                            {contender.driverAcronym}
                          </span>
                          {isContextDriver && (
                            <span className="border border-cyan/25 px-1 py-0.5 text-[7px] tracking-[0.1em] text-cyan">
                              CONTEXT
                            </span>
                          )}
                        </div>

                        <p className="mt-2 truncate text-xs font-semibold text-white">
                          {contender.driverName}
                        </p>

                        <p className="mt-1 truncate text-[10px] text-white/40">
                          {contender.teamName}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[9px] uppercase tracking-wider text-white/35">
                          Index
                        </p>

                        <p className="mt-1 text-xl font-bold text-cyan">
                          {formatIndex(contender.titlePathIndex)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
                      <span className="text-[10px] text-white/55">
                        {contender.currentPoints} pts
                      </span>

                      <span className="text-[10px] text-white/35">
                        {contender.gapToLeader === 0
                          ? 'Leader'
                          : `+${contender.gapToLeader} gap`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedContender && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.6fr]">
              <div className="border border-white/10 bg-black/20">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-cyan" />

                    <div>
                      <h3 className="text-[11px] uppercase tracking-[0.16em] text-white">
                        {selectedContender.driverAcronym} Factor Breakdown
                      </h3>

                      <p className="mt-1 text-[9px] text-white/35">
                        Weighted contribution to the Title Path Index
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-white/35">
                      Path Index
                    </span>

                    <p className="text-2xl font-bold text-cyan">
                      {formatIndex(selectedContender.titlePathIndex)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  {selectedContender.factorScores.map((factor) => {
                    const score = factor.normalizedScore ?? 0;
                    const contribution = factor.contribution ?? 0;

                    return (
                      <div key={factor.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] font-medium text-white/85">
                                {factor.label}
                              </p>

                              <span
                                className={`text-[8px] uppercase tracking-wider ${getDataStateClasses(
                                  factor.dataState
                                )}`}
                              >
                                {getDataStateLabel(factor.dataState)}
                              </span>
                            </div>

                            <p className="mt-1 text-[9px] text-white/35">
                              {factor.description}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-[11px] text-white">
                              {factor.normalizedScore === null
                                ? '—'
                                : `${score.toFixed(1)}/100`}
                            </p>

                            <p className="mt-1 text-[9px] text-white/35">
                              {(factor.weight * 100).toFixed(0)}% weight ·{' '}
                              {factor.contribution === null
                                ? 'not used'
                                : `${contribution.toFixed(1)} influence`}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 h-1.5 overflow-hidden bg-white/5">
                          <div
                            className={`h-full transition-all duration-500 ${getFactorBarClasses(
                              factor
                            )}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-white/10 bg-black/20">
                  <div className="border-b border-white/10 px-4 py-3">
                    <h3 className="text-[11px] uppercase tracking-[0.16em] text-white">
                      Evidence Notes
                    </h3>
                  </div>

                  <div className="space-y-2 p-4">
                    {selectedContender.observations.length > 0 ? (
                      selectedContender.observations.map((observation) => (
                        <div
                          key={observation}
                          className="border border-white/10 bg-white/[0.02] px-3 py-2.5"
                        >
                          <p className="text-[10px] leading-relaxed text-white/60">
                            {observation}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] leading-relaxed text-white/35">
                        No evidence notes are available until more verified
                        race-result coverage is indexed.
                      </p>
                    )}
                  </div>
                </div>

                <div className="border border-cyan/20 bg-cyan/[0.03] px-4 py-3">
                  <p className="text-[9px] uppercase tracking-[0.15em] text-cyan">
                    Model Integrity
                  </p>

                  <p className="mt-2 text-[10px] leading-relaxed text-white/55">
                    This index ranks the current evidence available for each
                    contender. It does not claim who will win the Drivers'
                    Championship.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-white/10 pt-4">
            <p className="mb-2 text-[9px] uppercase tracking-[0.16em] text-white/35">
              Methodology Protocol
            </p>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {scenarioSnapshot.methodologyNotes.map((note) => (
                <p
                  key={note}
                  className="text-[10px] leading-relaxed text-white/45"
                >
                  • {note}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
