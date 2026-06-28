import { useEffect, useMemo, useState } from 'react';
import { BootSequence } from './components/BootSequence';
import { AppShell } from './components/AppShell';
import { ChampionshipHero } from './components/ChampionshipHero';
import { DriverStandingsPanel } from './components/DriverStandingsPanel';
import { ConstructorsPanel } from './components/ConstructorsPanel';
import { RaceTimeline } from './components/RaceTimeline';
import { ForecastEnginePanel } from './components/ForecastEnginePanel';
import { MethodologyPanel } from './components/MethodologyPanel';
import { DataIntegrityPanel } from './components/DataIntegrityPanel';
import { DriverIntelPage } from './features/driverIntel/DriverIntelPage';
import { selectDriverIntelSnapshot } from './features/driverIntel/driverIntelSelectors';
import { useChampionshipData } from './hooks/useChampionshipData';
import { ScenarioSimulatorPanel } from './components/ScenarioSimulatorPanel';
import { CommandCentrePanel } from './components/CommandCentrePanel';
import { TeamPerformancePage } from './features/teamPerformance/TeamPerformancePage';
import { CircuitMatrixPage } from './features/circuitMatrix/CircuitMatrixPage';
import { ModelNotesPage } from './features/notes/ModelNotesPage';
import { DISCLAIMER_TEXT } from './config/appConfig';

function App() {
  const [bootComplete, setBootComplete] = useState(false);
  const [activeSection, setActiveSection] = useState('command');
  const [selectedDriverNumber, setSelectedDriverNumber] = useState<number | null>(null);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [autoSyncCountdown, setAutoSyncCountdown] = useState(60);
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
  const driverIntelSnapshot = selectDriverIntelSnapshot(data, selectedDriverNumber);

  const handleDriverSelect = (driverNumber: number) => {
    setSelectedDriverNumber(driverNumber);
    setActiveSection('driver-intel');
  };

  const autoSyncStatus = useMemo(() => {
    if (activeSection !== 'command') return 'paused-manual';
    if (!isDocumentVisible) return 'paused-tab-inactive';
    if (cooldownSeconds > 0) return 'paused-rate-limit';
    if (isLoading) return 'paused-manual';
    return 'enabled';
  }, [activeSection, cooldownSeconds, isDocumentVisible, isLoading]);

  useEffect(() => {
    const handleVisibility = () => setIsDocumentVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    handleVisibility();
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    setAutoSyncCountdown(60);
  }, [activeSection, autoSyncStatus]);

  useEffect(() => {
    if (autoSyncStatus !== 'enabled') return;

    const interval = window.setInterval(() => {
      setAutoSyncCountdown((countdown) => {
        if (countdown <= 1) {
          refreshData(true);
          return 60;
        }
        return countdown - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [autoSyncStatus, refreshData]);

  const autoSyncLabel = useMemo(() => {
    if (autoSyncStatus === 'enabled') {
      return `AUTO-SYNC ENABLED · NEXT CHECK IN ${String(Math.floor(autoSyncCountdown / 60)).padStart(2, '0')}:${String(autoSyncCountdown % 60).padStart(2, '0')}`;
    }
    if (autoSyncStatus === 'paused-tab-inactive') {
      return 'AUTO-SYNC PAUSED · TAB INACTIVE';
    }
    if (autoSyncStatus === 'paused-rate-limit') {
      return 'AUTO-SYNC PAUSED · RATE LIMIT COOLDOWN';
    }
    return 'AUTO-SYNC PAUSED · MANUAL MODE';
  }, [autoSyncCountdown, autoSyncStatus]);

  const renderMainContent = () => {
    if (activeSection === 'command') {
      return (
        <div className="max-w-[1800px] mx-auto space-y-4">
          <CommandCentrePanel
            data={data}
            isLoading={isLoading}
            error={error}
            loadingMessage={loadingMessage}
            sourceState={sourceState}
            isFromCache={isFromCache}
            lastSyncTime={lastSyncTime}
            autoSyncLabel={autoSyncLabel}
            cooldownSeconds={cooldownSeconds}
          />

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

          <div className="pt-4 pb-2">
            <p className="text-center text-[10px] text-white/20 tracking-wider max-w-xl mx-auto">
              {DISCLAIMER_TEXT}
            </p>
          </div>
        </div>
      );
    }

  if (activeSection === 'championship') {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 max-w-[1800px] mx-auto">
      <div className="xl:col-span-12">
        <ChampionshipHero
          isLoading={isLoading && !data}
          error={error && !error.canShowCachedData ? error : null}
          data={data}
          loadingMessage={loadingMessage}
          sourceState={sourceState}
        />
      </div>

      <div className="xl:col-span-8 space-y-4">
        <DriverStandingsPanel
          data={data}
          isLoading={isLoading}
          onDriverSelect={handleDriverSelect}
        />

        <ForecastEnginePanel
          data={data}
          isLoading={isLoading}
        />

        <RaceTimeline
          data={data}
          isLoading={isLoading}
        />
      </div>

      <div className="xl:col-span-4 space-y-4">
        <ConstructorsPanel
          data={data}
          isLoading={isLoading}
        />

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

      <div className="xl:col-span-12 pt-8 pb-4">
        <p className="text-center text-[10px] text-white/20 tracking-wider max-w-xl mx-auto">
          {DISCLAIMER_TEXT}
        </p>
      </div>
    </div>
  );
}

    if (activeSection === 'driver-intel') {
      return <DriverIntelPage snapshot={driverIntelSnapshot} />;
    }

    if (activeSection === 'team') {
      return <TeamPerformancePage data={data} isLoading={isLoading} />;
    }

    if (activeSection === 'circuit') {
      return <CircuitMatrixPage data={data} isLoading={isLoading} />;
    }

    if (activeSection === 'notes') {
      return <ModelNotesPage data={data} />;
    }

    if (activeSection === 'scenario') {
      return (
        <div className="max-w-[1800px] mx-auto">
          <ScenarioSimulatorPanel data={data} />
        </div>
      );
    }

    return (
      <div className="max-w-[1800px] mx-auto space-y-4">
        <CommandCentrePanel
          data={data}
          isLoading={isLoading}
          error={error}
          loadingMessage={loadingMessage}
          sourceState={sourceState}
          isFromCache={isFromCache}
          lastSyncTime={lastSyncTime}
          autoSyncLabel={autoSyncLabel}
          cooldownSeconds={cooldownSeconds}
        />

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
    );
  };

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
          error={error}
          dataSource={dataSourceLabel}
          completedRounds={completedRoundCount}
          totalRounds={totalGrandPrixCount}
          lastSync={lastSyncTime}
          onRefresh={() => refreshData(true)}
          loadingMessage={loadingMessage}
          cooldownSeconds={cooldownSeconds}
          sourceState={sourceState}
          isFromCache={isFromCache}
          activeSection={activeSection}
          onNavigate={setActiveSection}
        >
          {renderMainContent()}
        </AppShell>
      </div>
    </div>
  );
}

export default App;
