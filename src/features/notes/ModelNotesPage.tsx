import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Binary,
  Box,
  CheckCircle2,
  ChevronRight,
  CircuitBoard,
  ClipboardCheck,
  Database,
  FileText,
  Gauge,
  Layers,
  RefreshCw,
  Scale,
  Shield,
  ShieldCheck,
  ShieldQuestion,
  Zap,
} from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import type { ChampionshipDataSnapshot } from '../../types/f1';

interface ModelNotesPageProps {
  data: ChampionshipDataSnapshot | null;
}

export function ModelNotesPage({ data }: ModelNotesPageProps) {
  const archiveCoverage = useMemo(() => {
    const indexed = data?.analyticsCoverage?.indexedRaceResults ?? 0;
    const total = data?.analyticsCoverage?.totalCompletedRaceSessions ?? 0;
    const percent = total > 0 ? Math.round((indexed / total) * 100) : 0;
    const missing = Math.max(0, total - indexed);
    return { indexed, total, percent, missing };
  }, [data?.analyticsCoverage?.indexedRaceResults, data?.analyticsCoverage?.totalCompletedRaceSessions]);

  const hasPendingWork = data?.analyticsArchive?.hasPendingWork ?? false;
  const isComplete = data?.analyticsArchive?.isComplete ?? false;

  return (
    <div className="mx-auto max-w-[1800px] space-y-4">
      {/* Model Trust Hero */}
      <section className="relative overflow-hidden border border-white/10 bg-[#0b0d12]/85">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_95%_5%,rgba(0,212,255,0.06),transparent_25%),radial-gradient(circle_at_5%_95%,rgba(220,20,60,0.04),transparent_25%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan/30 to-transparent" />

        <div className="relative p-5 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan" />
                <p className="text-[10px] uppercase tracking-[0.24em] text-cyan">
                  Model Trust Console
                </p>
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-[0.08em] text-white md:text-4xl">
                APEX METHODOLOGY &amp; CONTROLS
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">
                APEX 26 is a verified motorsport intelligence portfolio system. All displayed metrics derive from verified OpenF1 session data, local cache, or archive reconstruction. No predictions, tyre strategy, or live timing are shown unless a verified source supports them.
              </p>
            </div>

            {/* Status badges */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="border border-cyan/25 bg-cyan/[0.04] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-cyan" />
                  <p className="text-[8px] uppercase tracking-[0.16em] text-white/35">
                    Data Discipline
                  </p>
                </div>
                <p className="mt-2 text-sm font-bold text-cyan">
                  VERIFIED INPUTS ONLY
                </p>
                <p className="mt-1 text-[9px] text-white/40">
                  No synthetic data layers
                </p>
              </div>

              <div className="border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-green-400" />
                  <p className="text-[8px] uppercase tracking-[0.16em] text-white/35">
                    Archive Status
                  </p>
                </div>
                <p className="mt-2 text-sm font-bold text-white">
                  {archiveCoverage.total > 0
                    ? `${archiveCoverage.indexed}/${archiveCoverage.total} INDEXED`
                    : 'AWAITING DATA'}
                </p>
                <p className="mt-1 text-[9px] text-white/40">
                  {isComplete
                    ? 'Archive complete'
                    : hasPendingWork
                      ? `${archiveCoverage.missing} rounds pending`
                      : 'Awaiting completed-race ingestion'}
                </p>
              </div>

              <div className="border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Gauge className="h-3.5 w-3.5 text-amber" />
                  <p className="text-[8px] uppercase tracking-[0.16em] text-white/35">
                    Unsupported Features
                  </p>
                </div>
                <p className="mt-2 text-sm font-bold text-white">
                  HIDDEN BY DESIGN
                </p>
                <p className="mt-1 text-[9px] text-white/40">
                  Live timing, tyres, predictions
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intelligence Architecture Map */}
      <section className="border border-white/10 bg-graphite-light/30">
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3">
          <CircuitBoard className="h-4 w-4 text-cyan" />
          <p className="text-sm uppercase tracking-[0.18em] text-white/70">
            Intelligence Architecture Map
          </p>
        </div>

        <div className="p-4 md:p-5">
          <p className="mb-4 max-w-3xl text-[11px] leading-relaxed text-white/45">
            Data flows from verified sources through cache and archive layers into championship standings and race records. All modules consume this verified intelligence; none generate synthetic inputs.
          </p>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            {/* Source */}
            <div className="flex-1 border border-green-400/30 bg-green-400/[0.04] p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <p className="text-[9px] uppercase tracking-[0.2em] text-green-400">
                  Verified Source
                </p>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">OpenF1 Public API</p>
              <p className="mt-1 text-[10px] text-white/40">
                Session, championship, driver metadata
              </p>
            </div>

            <ArrowRight className="hidden h-4 w-4 text-white/20 md:block" />
            <ArrowDown className="h-4 w-4 text-white/20 md:hidden" />

            {/* Cache & Archive */}
            <div className="flex-1 border border-cyan/30 bg-cyan/[0.04] p-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-cyan" />
                <p className="text-[9px] uppercase tracking-[0.2em] text-cyan">
                  Cache &amp; Archive
                </p>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">Local Versioned Cache</p>
              <p className="mt-1 text-[10px] text-white/40">
                30min core / 60min raw / archive reconstruction
              </p>
            </div>

            <ArrowRight className="hidden h-4 w-4 text-white/20 md:block" />
            <ArrowDown className="h-4 w-4 text-white/20 md:hidden" />

            {/* Processed */}
            <div className="flex-1 border border-white/20 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2">
                <Binary className="h-4 w-4 text-white/70" />
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/50">
                  Processed Data
                </p>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">Standings &amp; Race Records</p>
              <p className="mt-1 text-[10px] text-white/40">
                Completed rounds, driver results, metrics
              </p>
            </div>

            <ArrowRight className="hidden h-4 w-4 text-white/20 md:block" />
            <ArrowDown className="h-4 w-4 text-white/20 md:hidden" />

            {/* Modules */}
            <div className="flex-1 border border-amber/30 bg-amber/[0.04] p-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber" />
                <p className="text-[9px] uppercase tracking-[0.2em] text-amber">
                  Intelligence Modules
                </p>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">Driver Intel / Team / Circuit</p>
              <p className="mt-1 text-[10px] text-white/40">
                Evidence-based analysis panels
              </p>
            </div>
          </div>

          <p className="mt-4 text-[10px] text-white/30">
            <strong className="text-amber">Scenario Lab</strong> is a transparent evidence model, not betting advice or a title prediction engine. All outputs are derived from verified standings and indexed race evidence.
          </p>
        </div>
      </section>

      {/* Data Source & Archive Policy */}
      <section className="border border-white/10 bg-graphite-light/30">
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3">
          <FileText className="h-4 w-4 text-cyan" />
          <p className="text-sm uppercase tracking-[0.18em] text-white/70">
            Data Source &amp; Archive Policy
          </p>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-sm border border-white/10 bg-black/10 p-3">
            <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-white/30">
              <ShieldCheck className="h-3 w-3 text-green-400" />
              Live/Verified Source
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/70">
              APEX consumes the OpenF1 public API for session metadata, championship standings, and race results. All data is verified against completed sessions only.
            </p>
          </div>

          <div className="rounded-sm border border-white/10 bg-black/10 p-3">
            <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-white/30">
              <Database className="h-3 w-3 text-cyan" />
              Local Cache Behaviour
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/70">
              Core snapshot cached for 30 minutes. Raw session data cached for 60 minutes. Cache uses versioned envelope with expiry validation. Expired cache shows fallback indicator.
            </p>
          </div>

          <div className="rounded-sm border border-white/10 bg-black/10 p-3">
            <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-white/30">
              <RefreshCw className="h-3 w-3 text-cyan" />
              Archive Reconstruction
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/70">
              On load, APEX attempts to rebuild race history from cached session results. Missing descriptors are queued for indexing. No results are fabricated.
            </p>
          </div>

          <div className="rounded-sm border border-white/10 bg-black/10 p-3">
            <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-white/30">
              <CheckCircle2 className="h-3 w-3 text-green-400" />
              Completed-Round Verification
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/70">
              A session is considered completed 15 minutes after its scheduled end time. Only completed races contribute to standings and metrics.
            </p>
          </div>

          <div className="rounded-sm border border-amber/20 bg-amber/[0.03] p-3">
            <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-amber/60">
              <AlertTriangle className="h-3 w-3 text-amber" />
              Partial Archive Handling
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/70">
              When archive coverage is below 100%, modules display PENDING or partial indicators. Metrics are computed only from indexed races. Users may trigger manual archive loading.
            </p>
          </div>

          <div className="rounded-sm border border-amber/20 bg-amber/[0.03] p-3">
            <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-amber/60">
              <ShieldQuestion className="h-3 w-3 text-amber" />
              Missing-Data Behaviour
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/70">
              Null or unavailable values display as em-dash (—) or VERIFICATION PENDING. No interpolation, estimation, or synthetic fill is performed.
            </p>
          </div>

          <div className="rounded-sm border border-crimson/30 bg-crimson/[0.04] p-3">
            <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-crimson/70">
              <Zap className="h-3 w-3 text-crimson" />
              Rate-Limit / Access Restriction
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/70">
              HTTP 429 responses trigger cooldown pauses. Public access restrictions during live sessions disable sync until the session window closes. Cached data remains visible.
            </p>
          </div>
        </div>
      </section>

      {/* Metric Dictionary */}
      <section className="border border-white/10 bg-graphite-light/30">
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3">
          <ClipboardCheck className="h-4 w-4 text-cyan" />
          <p className="text-sm uppercase tracking-[0.18em] text-white/70">
            Metric Dictionary
          </p>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-sm border border-white/10 bg-black/10 p-3">
            <p className="text-[8px] uppercase tracking-[0.18em] text-cyan">Championship Points</p>
            <p className="mt-2 text-[11px] font-semibold text-white">Direct Verified Input</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/40">
              Points totals from OpenF1 championship endpoints for the latest completed session.
            </p>
          </div>

          <div className="rounded-sm border border-white/10 bg-black/10 p-3">
            <p className="text-[8px] uppercase tracking-[0.18em] text-cyan">Gap to Leader</p>
            <p className="mt-2 text-[11px] font-semibold text-white">Derived Metric</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/40">
              Computed as leader points minus driver/constructor points. Zero for the leader.
            </p>
          </div>

          <div className="rounded-sm border border-white/10 bg-black/10 p-3">
            <p className="text-[8px] uppercase tracking-[0.18em] text-cyan">Recent Form Markers</p>
            <p className="mt-2 text-[11px] font-semibold text-white">Derived Metric</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/40">
              W/P/D/R codes from last 3 indexed races. Unavailable if fewer than 3 completed races exist.
            </p>
          </div>

          <div className="rounded-sm border border-white/10 bg-black/10 p-3">
            <p className="text-[8px] uppercase tracking-[0.18em] text-cyan">Average Finish</p>
            <p className="mt-2 text-[11px] font-semibold text-white">Derived Metric</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/40">
              Mean classified finishing position. DNF/DNS/DSQ excluded from calculation.
            </p>
          </div>

          <div className="rounded-sm border border-white/10 bg-black/10 p-3">
            <p className="text-[8px] uppercase tracking-[0.18em] text-cyan">Qualifying Position</p>
            <p className="mt-2 text-[11px] font-semibold text-white">Direct Verified Input</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/40">
              Grid position from indexed qualifying session results. Null if unavailable.
            </p>
          </div>

          <div className="rounded-sm border border-white/10 bg-black/10 p-3">
            <p className="text-[8px] uppercase tracking-[0.18em] text-cyan">Completion Rate</p>
            <p className="mt-2 text-[11px] font-semibold text-white">Derived Metric</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/40">
              Percentage of race starts resulting in classified finish. Excludes DNF/DNS/DSQ.
            </p>
          </div>

          <div className="rounded-sm border border-white/10 bg-black/10 p-3">
            <p className="text-[8px] uppercase tracking-[0.18em] text-cyan">Team Performance Index</p>
            <p className="mt-2 text-[11px] font-semibold text-white">Derived Metric</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/40">
              Normalized score from points per round and reliability. Scale 0-100. Higher is better.
            </p>
          </div>

          <div className="rounded-sm border border-white/10 bg-black/10 p-3">
            <p className="text-[8px] uppercase tracking-[0.18em] text-cyan">Driver Contribution %</p>
            <p className="mt-2 text-[11px] font-semibold text-white">Derived Metric</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/40">
              Driver points as percentage of constructor total. Computed from verified standings.
            </p>
          </div>

          <div className="rounded-sm border border-white/10 bg-black/10 p-3">
            <p className="text-[8px] uppercase tracking-[0.18em] text-cyan">Teammate Gap</p>
            <p className="mt-2 text-[11px] font-semibold text-white">Derived Metric</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/40">
              Average finishing position delta vs teammate. Positive = teammate finished ahead.
            </p>
          </div>

          <div className="rounded-sm border border-white/10 bg-black/10 p-3">
            <p className="text-[8px] uppercase tracking-[0.18em] text-amber">Title Path Index</p>
            <p className="mt-2 text-[11px] font-semibold text-white">Scenario Lab Metric</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/40">
              Evidence-based contender ranking. Not a probability. Derived from points, reliability, and remaining races.
            </p>
          </div>
        </div>
      </section>

      {/* Replay Integrity Protocol */}
      <section className="border border-white/10 bg-graphite-light/30">
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3">
          <Scale className="h-4 w-4 text-cyan" />
          <p className="text-sm uppercase tracking-[0.18em] text-white/70">
            Replay Integrity Protocol
          </p>
        </div>

        <div className="p-4 md:p-5">
          <p className="max-w-3xl text-[11px] leading-relaxed text-white/50">
            The Replay module provides historical session navigation and verified race intelligence. It operates under strict data discipline:
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-sm border border-green-400/25 bg-green-400/[0.04] p-3">
              <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-green-400/70">
                <CheckCircle2 className="h-3 w-3" />
                Historical Verified
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-white/70">
                Replay data is sourced only from indexed, completed sessions. No live or simulated data enters replay streams.
              </p>
            </div>

            <div className="rounded-sm border border-green-400/25 bg-green-400/[0.04] p-3">
              <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-green-400/70">
                <CheckCircle2 className="h-3 w-3" />
                Not Live Timing
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-white/70">
                Replay is not represented as live timing unless a verified current timing stream exists. Labels clearly indicate archive playback.
              </p>
            </div>

            <div className="rounded-sm border border-green-400/25 bg-green-400/[0.04] p-3">
              <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-green-400/70">
                <CheckCircle2 className="h-3 w-3" />
                Navigation Intelligence
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-white/70">
                Event Bus and Timing Matrix data are navigational intelligence inputs for historical session review, not strategic advice.
              </p>
            </div>

            <div className="rounded-sm border border-crimson/25 bg-crimson/[0.04] p-3">
              <p className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] text-crimson/70">
                <AlertTriangle className="h-3 w-3" />
                No Fabricated Layers
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-white/70">
                Tyre state, weather, pit call predictions, strategy recommendations, and sector deltas are not displayed. Verified data only.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Scenario Model Guardrails */}
      <section className="border border-white/10 bg-graphite-light/30">
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3">
          <Shield className="h-4 w-4 text-amber" />
          <p className="text-sm uppercase tracking-[0.18em] text-white/70">
            Scenario Model Guardrails
          </p>
        </div>

        <div className="p-4 md:p-5">
          <p className="max-w-3xl text-[11px] leading-relaxed text-white/50">
            Scenario Lab computes an evidence-based Title Path Index from verified standings and archived race data. It is explicitly not a prediction engine:
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="rounded-sm border border-green-400/25 bg-green-400/[0.04] p-3">
                <p className="text-[9px] uppercase tracking-[0.18em] text-green-400">
                  What Scenario Lab Does
                </p>
                <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-white/70">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-green-400" />
                    <span>Ranks contenders by current points position</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-green-400" />
                    <span>Uses archived race and qualifying evidence</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-green-400" />
                    <span>Factors in reliability and completion signals</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-green-400" />
                    <span>Signals when partial archive limits confidence</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-sm border border-crimson/25 bg-crimson/[0.04] p-3">
                <p className="text-[9px] uppercase tracking-[0.18em] text-crimson">
                  What Scenario Lab Does NOT Do
                </p>
                <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-white/70">
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-crimson" />
                    <span>Not a title-win probability estimator</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-crimson" />
                    <span>Not a financial or betting advice product</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-crimson" />
                    <span>Not a race outcome prediction engine</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-crimson" />
                    <span>Not reliable with incomplete archive coverage</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-sm border border-amber/25 bg-amber/[0.04] px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber" />
            <p className="text-[11px] leading-relaxed text-white/70">
              Partial archive conditions reduce confidence. Scenario Lab displays archive coverage and explicitly marks limited-data situations. Users should not use outputs for external decisions.
            </p>
          </div>
        </div>
      </section>

      {/* Build & Version Record */}
      <section className="border border-white/10 bg-graphite-light/30">
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3">
          <Box className="h-4 w-4 text-cyan" />
          <p className="text-sm uppercase tracking-[0.18em] text-white/70">
            Build &amp; Version Record
          </p>
        </div>

        <div className="p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-sm border border-white/10 bg-black/10 p-3">
              <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">System</p>
              <p className="mt-2 text-sm font-bold text-white">{APP_CONFIG.name} Intelligence OS</p>
              <p className="mt-1 text-[10px] text-white/40">v{APP_CONFIG.version} / {APP_CONFIG.year} Season</p>
            </div>

            <div className="rounded-sm border border-white/10 bg-black/10 p-3">
              <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">Stack</p>
              <p className="mt-2 text-sm font-bold text-white">React + TypeScript</p>
              <p className="mt-1 text-[10px] text-white/40">Vite / Strict Mode / No Any</p>
            </div>

            <div className="rounded-sm border border-white/10 bg-black/10 p-3">
              <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">Data Origin</p>
              <p className="mt-2 text-sm font-bold text-white">OpenF1-Derived Verified</p>
              <p className="mt-1 text-[10px] text-white/40">Session, championship, driver metadata</p>
            </div>

            <div className="rounded-sm border border-white/10 bg-black/10 p-3">
              <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">Persistence</p>
              <p className="mt-2 text-sm font-bold text-white">Local Cache &amp; Archive</p>
              <p className="mt-1 text-[10px] text-white/40">Versioned / Expiry-validated</p>
            </div>

            <div className="rounded-sm border border-white/10 bg-black/10 p-3">
              <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">Context Model</p>
              <p className="mt-2 text-sm font-bold text-white">Shared Intelligence Context</p>
              <p className="mt-1 text-[10px] text-white/40">Driver, team, meeting selection</p>
            </div>

            <div className="rounded-sm border border-white/10 bg-black/10 p-3">
              <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">Replay Stream</p>
              <p className="mt-2 text-sm font-bold text-white">Verified Replay Stream</p>
              <p className="mt-1 text-[10px] text-white/40">Historical session data only</p>
            </div>

            <div className="rounded-sm border border-white/10 bg-black/10 p-3">
              <p className="text-[8px] uppercase tracking-[0.18em] text-white/30">Build State</p>
              <p className="mt-2 text-sm font-bold text-white">Portfolio Demonstration</p>
              <p className="mt-1 text-[10px] text-white/40">Not production motorsport software</p>
            </div>

            <div className="rounded-sm border border-amber/20 bg-amber/[0.03] p-3">
              <p className="text-[8px] uppercase tracking-[0.18em] text-amber/60">Disclaimer</p>
              <p className="mt-2 text-sm font-bold text-white">Unofficial Project</p>
              <p className="mt-1 text-[10px] leading-relaxed text-white/40">
                Not affiliated with Formula 1, FIA, or any racing team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer integrity notice */}
      <div className="border-t border-white/5 py-4 text-center">
        <p className="text-[9px] uppercase tracking-[0.16em] text-white/25">
          APEX 26 MODEL TRUST CONSOLE · VERIFIED INPUTS ONLY · NO PREDICTIONS OR FABRICATED DATA
        </p>
      </div>
    </div>
  );
}
