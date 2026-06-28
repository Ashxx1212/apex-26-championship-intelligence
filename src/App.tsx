import { useState } from 'react';
import { BootSequence } from './components/BootSequence';
import { AppShell } from './components/AppShell';
import { ChampionshipHero } from './components/ChampionshipHero';
import { DriverStandingsPanel } from './components/DriverStandingsPanel';
import { ConstructorsPanel } from './components/ConstructorsPanel';
import { RaceTimeline } from './components/RaceTimeline';
import { ForecastEnginePanel } from './components/ForecastEnginePanel';
import { MethodologyPanel } from './components/MethodologyPanel';
import { DataIntegrityPanel } from './components/DataIntegrityPanel';
import { useChampionshipData } from './hooks/useChampionshipData';
import { DISCLAIMER_TEXT } from './config/appConfig';

function App() {
  const [bootComplete, setBootComplete] = useState(false);
  const {
    data,
    isLoading,
    isAnalyticsLoading,
    error,
    sourceState,
    isFromCache,
    lastSyncTime,
    cooldownSeconds,
    analyticsProgress,
    loadingMessage,
    refreshData,
    loadAnalyticsArchive,
  } = useChampionshipData();

  // Derive display values from state
  const dataSourceLabel = sourceState === 'cached'
    ? 'OpenF1 (Cached)'
    : sourceState === 'rate_limited'
      ? 'OpenF1 (Rate Limited)'
      : 'OpenF1';

  const completedRoundCount = data?.completedRounds || 0;
  const totalGrandPrixCount = data?.totalGrandPrix || 0;

  return (
    <div className="min-h-screen bg-graphite">
      {/* Boot sequence overlay */}
      {!bootComplete && (
        <BootSequence onComplete={() => setBootComplete(true)} />
      )}

      {/* Main application */}
      <div
        className={`transition-opacity duration-700 ${
          bootComplete ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <AppShell
          isLoading={isLoading}
          error={error ? { type: error.type, message: error.message, retryAfter: error.retryAfter } : null}
          dataSource={dataSourceLabel}
          completedRounds={completedRoundCount}
          totalRounds={totalGrandPrixCount}
          lastSync={lastSyncTime}
          onRefresh={() => refreshData(true)}
          loadingMessage={loadingMessage}
          cooldownSeconds={cooldownSeconds}
          sourceState={sourceState}
          isFromCache={isFromCache}
        >
          {/* Dashboard grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 max-w-[1800px] mx-auto">
            {/* Hero section */}
            <div className="xl:col-span-12">
              <ChampionshipHero
                isLoading={isLoading && !data}
                error={error && !error.canShowCachedData ? error : null}
                data={data}
                loadingMessage={loadingMessage}
                sourceState={sourceState}
              />
            </div>

            {/* Left column - Standings */}
            <div className="xl:col-span-8 space-y-4">
              <DriverStandingsPanel data={data} isLoading={isLoading} />
              <ForecastEnginePanel data={data} isLoading={isLoading} />
              <RaceTimeline data={data} isLoading={isLoading} />
            </div>

            {/* Right column - Additional panels */}
            <div className="xl:col-span-4 space-y-4">
              <ConstructorsPanel data={data} isLoading={isLoading} />
              <MethodologyPanel />
              <DataIntegrityPanel
                data={data}
                lastUpdated={lastSyncTime}
                isFromCache={isFromCache}
                sourceState={sourceState}
                onRefresh={() => refreshData(true)}
                onLoadAnalytics={loadAnalyticsArchive}
                isAnalyticsLoading={isAnalyticsLoading}
                analyticsProgress={analyticsProgress}
                cooldownSeconds={cooldownSeconds}
              />
            </div>

            {/* Footer disclaimer */}
            <div className="xl:col-span-12 pt-8 pb-4">
              <div className="text-center">
                <p className="text-[10px] text-white/20 tracking-wider max-w-xl mx-auto">
                  {DISCLAIMER_TEXT}
                </p>
              </div>
            </div>
          </div>
        </AppShell>
      </div>
    </div>
  );
}

export default App;
