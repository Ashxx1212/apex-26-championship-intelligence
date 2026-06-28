import { useState } from 'react';
import {
  Activity,
  AlertCircle,
  Database,
  FlaskConical,
  Gauge,
  ShieldCheck,
  Trophy,
} from 'lucide-react';

import type { ChampionshipDataSnapshot } from '../types/f1';
import type {
  ScenarioDataState,
  ScenarioFactorScore,
} from '../features/scenarioLab/scenarioLabTypes';
import { buildScenarioLabSnapshot } from '../features/scenarioLab/scenarioLabEngine';

interface ScenarioSimulatorPanelProps {
  /**
   * Optional for now so the existing app remains build-safe.
   * We will wire the verified championship snapshot into this component next.
   */
  data?: ChampionshipDataSnapshot | null;
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
  if (dataState === 'verified') {
    return 'text-green-400/80';
  }

  if (dataState === 'calculated') {
    return 'text-cyan/80';
  }

  return 'text-amber/80';
}

function getDataStateLabel(dataState: ScenarioDataState): string {
  if (dataState === 'verified') return 'Verified input';
  if (dataState === 'calculated') return 'Calculated metric';
  return 'Unavailable';
}

function getFactorBarClasses(factor: ScenarioFactorScore): string {
  if (factor.dataState === 'unavailable') {
    return 'bg-white/10';
  }

  if (factor.id === 'championshipPosition') {
    return 'bg-crimson';
  }

  if (factor.id === 'reliability') {
    return 'bg-green-400';
  }

  return 'bg-cyan';
}

function formatIndex(value: number | null): string {
  if (value === null) return '—';
  return value.toFixed(1);
}

export function ScenarioSimulatorPanel({
  data = null,
}: ScenarioSimulatorPanelProps) {
  const scenarioSnapshot = buildScenarioLabSnapshot(data);

  const [selectedDriverNumber, setSelectedDriverNumber] = useState<
    number | null
  >(null);

  const selectedContender =
    scenarioSnapshot.contenders.find(
      (contender) => contender.driverNumber === selectedDriverNumber
    ) ??
    scenarioSnapshot.contenders[0] ??
    null;

  const isInsufficient =
    scenarioSnapshot.readiness === 'INSUFFICIENT_DATA';

  return (
    <section className="bg-graphite-light/50 border border-white/10 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 py-3 border-b border-white/10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-cyan" />
          <h2 className="text-sm tracking-[0.2em] text-white font-bold">
            SCENARIO LAB
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] tracking-[0.14em] text-white/35 uppercase">
            Transparent contender model
          </span>

          <span
            className={`border rounded-sm px-2 py-1 text-[9px] tracking-[0.12em] uppercase ${getReadinessClasses(
              scenarioSnapshot.readiness
            )}`}
          >
            {getReadinessLabel(scenarioSnapshot.readiness)}
          </span>
        </div>
      </div>

      {/* Integrity statement */}
      <div className="flex flex-col gap-3 px-4 py-4 border-b border-white/10 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-cyan mt-0.5 shrink-0" />

          <div>
            <p className="text-xs text-white font-medium tracking-wide">
              TITLE PATH INDEX
            </p>

            <p className="text-[10px] text-white/45 mt-1 leading-relaxed max-w-2xl">
              {scenarioSnapshot.disclaimer}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 min-w-[230px]">
          <div className="border border-white/10 bg-black/20 px-3 py-2">
            <div className="flex items-center gap-1.5 text-white/35">
              <Database className="w-3 h-3" />
              <span className="text-[9px] tracking-wider uppercase">
                Archive
              </span>
            </div>

            <p className="mt-1 text-sm font-bold text-cyan">
              {scenarioSnapshot.coverage.indexedRaceResults}/
              {scenarioSnapshot.coverage.completedRounds}
            </p>

            <p className="text-[9px] text-white/35">
              races indexed
            </p>
          </div>

          <div className="border border-white/10 bg-black/20 px-3 py-2">
            <div className="flex items-center gap-1.5 text-white/35">
              <Activity className="w-3 h-3" />
              <span className="text-[9px] tracking-wider uppercase">
                Remaining
              </span>
            </div>

            <p className="mt-1 text-sm font-bold text-white">
              {scenarioSnapshot.coverage.remainingRounds}
            </p>

            <p className="text-[9px] text-white/35">
              rounds ahead
            </p>
          </div>
        </div>
      </div>

      {isInsufficient ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <AlertCircle className="w-6 h-6 text-amber/70 mb-3" />

          <p className="text-sm text-white/70 text-center">
            Scenario Lab is awaiting enough verified race-result coverage.
          </p>

          <p className="text-[10px] text-white/35 mt-2 text-center max-w-md leading-relaxed">
            The model activates only after sufficient championship and
            archived race data is available. Missing data is never replaced
            with fabricated values.
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Contender leaderboard */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-crimson" />

                <h3 className="text-[11px] tracking-[0.18em] text-white/80 uppercase">
                  Title Contenders
                </h3>
              </div>

              <span className="text-[9px] tracking-wider text-white/30 uppercase">
                Top {scenarioSnapshot.contenders.length} by current points
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
              {scenarioSnapshot.contenders.map((contender) => {
                const isSelected =
                  selectedContender?.driverNumber === contender.driverNumber;

                return (
                  <button
                    key={contender.driverNumber}
                    type="button"
                    onClick={() =>
                      setSelectedDriverNumber(contender.driverNumber)
                    }
                    className={`text-left border p-3 transition-all duration-200 ${
                      isSelected
                        ? 'border-cyan/60 bg-cyan/5'
                        : 'border-white/10 bg-black/20 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            P{contender.currentPosition}
                          </span>

                          <span className="text-[10px] text-white/50">
                            {contender.driverAcronym}
                          </span>
                        </div>

                        <p className="mt-2 text-xs font-semibold text-white truncate">
                          {contender.driverName}
                        </p>

                        <p className="mt-1 text-[10px] text-white/40 truncate">
                          {contender.teamName}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[9px] tracking-wider text-white/35 uppercase">
                          Index
                        </p>

                        <p className="mt-1 text-xl font-bold text-cyan">
                          {formatIndex(contender.titlePathIndex)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
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

          {/* Selected contender detail */}
          {selectedContender && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.6fr]">
              <div className="border border-white/10 bg-black/20">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-cyan" />

                    <div>
                      <h3 className="text-[11px] tracking-[0.16em] text-white uppercase">
                        {selectedContender.driverAcronym} Factor Breakdown
                      </h3>

                      <p className="text-[9px] text-white/35 mt-1">
                        Weighted contribution to the Title Path Index
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] tracking-wider text-white/35 uppercase">
                      Path Index
                    </span>

                    <p className="text-2xl font-bold text-cyan">
                      {formatIndex(selectedContender.titlePathIndex)}
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-4">
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
                                className={`text-[8px] tracking-wider uppercase ${getDataStateClasses(
                                  factor.dataState
                                )}`}
                              >
                                {getDataStateLabel(factor.dataState)}
                              </span>
                            </div>

                            <p className="text-[9px] text-white/35 mt-1">
                              {factor.description}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-[11px] text-white">
                              {factor.normalizedScore === null
                                ? '—'
                                : `${score.toFixed(1)}/100`}
                            </p>

                            <p className="text-[9px] text-white/35 mt-1">
                              {(factor.weight * 100).toFixed(0)}% weight ·{' '}
                              {factor.contribution === null
                                ? 'not used'
                                : `${contribution.toFixed(1)} influence`}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 h-1.5 bg-white/5 overflow-hidden">
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
                  <div className="px-4 py-3 border-b border-white/10">
                    <h3 className="text-[11px] tracking-[0.16em] text-white uppercase">
                      Evidence Notes
                    </h3>
                  </div>

                  <div className="p-4 space-y-2">
                    {selectedContender.observations.length > 0 ? (
                      selectedContender.observations.map((observation) => (
                        <div
                          key={observation}
                          className="border border-white/10 bg-white/[0.02] px-3 py-2.5"
                        >
                          <p className="text-[10px] text-white/60 leading-relaxed">
                            {observation}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-white/35 leading-relaxed">
                        No evidence notes are available until more verified
                        race-result coverage is indexed.
                      </p>
                    )}
                  </div>
                </div>

                <div className="border border-cyan/20 bg-cyan/[0.03] px-4 py-3">
                  <p className="text-[9px] tracking-[0.15em] text-cyan uppercase">
                    Model integrity
                  </p>

                  <p className="text-[10px] text-white/55 leading-relaxed mt-2">
                    This index ranks the current evidence available for each
                    contender. It does not claim who will win the Drivers'
                    Championship.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Methodology footer */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-[9px] tracking-[0.16em] text-white/35 uppercase mb-2">
              Methodology protocol
            </p>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {scenarioSnapshot.methodologyNotes.map((note) => (
                <p
                  key={note}
                  className="text-[10px] text-white/45 leading-relaxed"
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