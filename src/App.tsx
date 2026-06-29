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
import { ActiveContextDock } from './components/ActiveContextDock';
import { TeamPerformancePage } from './features/teamPerformance/TeamPerformancePage';
import { CircuitMatrixPage } from './features/circuitMatrix/CircuitMatrixPage';
import { ModelNotesPage } from './features/notes/ModelNotesPage';
import { DISCLAIMER_TEXT } from './config/appConfig';

function App() {
  const [bootComplete, setBootComplete] = useState(false);
  const [activeSection, setActiveSection] = useState('command');
  const [selectedDriverNumber, setSelectedDriverNumber] = useState<number | null>(
    null
  );
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null);
  const [selectedMeetingKey, setSelectedMeetingKey] = useState<number | null>(null);
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
    isPublicAccessRestricted,
    sourceAccessRetrySeconds,
    analyticsProgress,
    loadingMessage,
    refreshData,
    loadAnalyticsArchive,
  } = useChampionshipData();

  const dataSourceLabel =
    sourceState === 'cached'
      ? 'OpenF1 (Cached)'
      : sourceState === 'rate_limited'
        ? 'OpenF1 (Rate Limited)'
        : 'OpenF1';

  const completedRoundCount = data?.completedRounds || 0;
  const totalGrandPrixCount = data?.totalGrandPrix || 0;
  const driverIntelSnapshot = selectDriverIntelSnapshot(
  data,
  selectedDriverNumber
);
  const selectedWeekendName =
  data?.raceWeekends.find(
    (weekend) => weekend.meetingKey === selectedMeetingKey
  )?.meetingName ??
  data?.currentMeeting?.meeting_name ??
  data?.nextUpcomingMeeting?.meeting_name ??
  null;

  const handleDriverSelect = (driverNumber: number) => {
    const selectedDriver = data?.driverStandings.find(
      (driver) => driver.driverNumber === driverNumber
    );

    setSelectedDriverNumber(driverNumber);

    if (selectedDriver?.teamName) {
      setSelectedTeamName(selectedDriver.teamName);
    }

    setActiveSection('driver-intel');
  };

  const handleTeamSelect = (teamName: string) => {
    setSelectedTeamName(teamName);
    setSelectedDriverNumber(null);
    setActiveSection('team');
  };

  const handleMeetingSelect = (meetingKey: number) => {
    setSelectedMeetingKey(meetingKey);
    setActiveSection('circuit');
  };

  const handleClearContext = () => {
    setSelectedDriverNumber(null);
    setSelectedTeamName(null);
    setSelectedMeetingKey(null);
  };

  const autoSyncStatus = useMemo(() => {
    if (activeSection !== 'command') return 'paused-manual';
    if (!isDocumentVisible) return 'paused-tab-inactive';

    if (isPublicAccessRestricted && sourceAccessRetrySeconds > 0) {
      return 'paused-source-access';
    }

    if (cooldownSeconds > 0) return 'paused-rate-limit';
    if (isLoading) return 'paused-manual';

    return 'enabled';
  }, [
    activeSection,
    cooldownSeconds,
    isDocumentVisible,
    isLoading,
    isPublicAccessRestricted,
    sourceAccessRetrySeconds,
  ]);

  useEffect(() => {
    const handleVisibility = () => setIsDocumentVisible(!document.hidden);

    document.addEventListener('visibilitychange', handleVisibility);
    handleVisibility();

    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
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
      return `AUTO-SYNC ENABLED · NEXT CHECK IN ${String(
        Math.floor(autoSyncCountdown / 60)
      ).padStart(2, '0')}:${String(autoSyncCountdown % 60).padStart(2, '0')}`;
    }

    if (autoSyncStatus === 'paused-tab-inactive') {
      return 'AUTO-SYNC PAUSED · TAB INACTIVE';
    }

    if (autoSyncStatus === 'paused-source-access') {
      return `AUTO-SYNC PAUSED · PUBLIC ACCESS RETRY IN ${String(
        Math.floor(sourceAccessRetrySeconds / 60)
      ).padStart(2, '0')}:${String(sourceAccessRetrySeconds % 60).padStart(
        2,
        '0'
      )}`;
    }

    if (autoSyncStatus === 'paused-rate-limit') {
      return 'AUTO-SYNC PAUSED · RATE LIMIT COOLDOWN';
    }

    return 'AUTO-SYNC PAUSED · MANUAL MODE';
  }, [
    autoSyncCountdown,
    autoSyncStatus,
    sourceAccessRetrySeconds,
  ]);

  const renderMainContent = () => {
    if (activeSection === 'command') {
      return (
        <div className="mx-auto max-w-[1800px] space-y-4">
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
            selectedDriverNumber={selectedDriverNumber}
selectedTeamName={selectedTeamName}
selectedMeetingKey={selectedMeetingKey}
onDriverSelect={handleDriverSelect}
onTeamSelect={handleTeamSelect}
onMeetingSelect={(meetingKey) => {
  setSelectedMeetingKey(meetingKey);
  setActiveSection('circuit');
}}
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
            isPublicAccessRestricted={isPublicAccessRestricted}
            sourceAccessRetrySeconds={sourceAccessRetrySeconds}
          />

          <div className="pb-2 pt-4">
            <p className="mx-auto max-w-xl text-center text-[10px] tracking-wider text-white/20">
              {DISCLAIMER_TEXT}
            </p>
          </div>
        </div>
      );
    }

    if (activeSection === 'championship') {
      return (
        <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-12">
            <ChampionshipHero
              isLoading={isLoading && !data}
              error={error && !error.canShowCachedData ? error : null}
              data={data}
              loadingMessage={loadingMessage}
              sourceState={sourceState}
            />
          </div>

          <div className="space-y-4 xl:col-span-8">
            <DriverStandingsPanel
              data={data}
              isLoading={isLoading}
              onDriverSelect={handleDriverSelect}
            />

           <ForecastEnginePanel
           data={data}
           isLoading={isLoading}
           onDriverSelect={handleDriverSelect}
           onTeamSelect={handleTeamSelect}
           />

            <RaceTimeline
            data={data}
            isLoading={isLoading}
            selectedMeetingKey={selectedMeetingKey}
            onMeetingSelect={(meetingKey) => {
              setSelectedMeetingKey(meetingKey);
              setActiveSection('circuit');
              }}
             />
          </div>

          <div className="space-y-4 xl:col-span-4">
            <ConstructorsPanel
            data={data}
            isLoading={isLoading}
            selectedTeamName={selectedTeamName}
            onTeamSelect={handleTeamSelect}
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
              isPublicAccessRestricted={isPublicAccessRestricted}
              sourceAccessRetrySeconds={sourceAccessRetrySeconds}
            />
          </div>

          <div className="pb-4 pt-8 xl:col-span-12">
            <p className="mx-auto max-w-xl text-center text-[10px] tracking-wider text-white/20">
              {DISCLAIMER_TEXT}
            </p>
          </div>
        </div>
      );
    }

    if (activeSection === 'driver-intel') {
  return (
    <DriverIntelPage
      snapshot={driverIntelSnapshot}
      availableDrivers={data?.driverStandings ?? []}
      selectedWeekendName={selectedWeekendName}
      onDriverSelect={handleDriverSelect}
      onOpenTeam={handleTeamSelect}
      onOpenScenarioLab={() => setActiveSection('scenario')}
      onOpenRace={(round) => {
  const matchingWeekend = data?.raceWeekends.find(
    (weekend) => weekend.round === round
  );

  if (matchingWeekend) {
    setSelectedMeetingKey(matchingWeekend.meetingKey);
    setActiveSection('circuit');
  }
}}
    />
  );
}

    if (activeSection === 'team') {
  return (
    <TeamPerformancePage
      data={data}
      isLoading={isLoading}
      selectedTeamName={selectedTeamName}
      selectedDriverNumber={selectedDriverNumber}
      onTeamSelect={setSelectedTeamName}
      onDriverSelect={handleDriverSelect}
      onOpenRace={(meetingKey) => {
  setSelectedMeetingKey(meetingKey);
  setActiveSection('circuit');
}}
    />
  );
}

    if (activeSection === 'circuit') {
      return (
  <CircuitMatrixPage
    data={data}
    isLoading={isLoading}
    selectedMeetingKey={selectedMeetingKey}
    onMeetingSelect={setSelectedMeetingKey}
    onOpenScenarioLab={(meetingKey) => {
      setSelectedMeetingKey(meetingKey);
      setActiveSection('scenario');
    }}
  />
);
    }

    if (activeSection === 'notes') {
      return <ModelNotesPage data={data} />;
    }

    if (activeSection === 'scenario') {
  return (
    <div className="mx-auto max-w-[1800px]">
      <ScenarioSimulatorPanel
        data={data}
        selectedDriverNumber={selectedDriverNumber}
        selectedTeamName={selectedTeamName}
        selectedMeetingKey={selectedMeetingKey}
      />
    </div>
  );
}

    return (
      <div className="mx-auto max-w-[1800px] space-y-4">
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
          selectedDriverNumber={selectedDriverNumber}
          selectedTeamName={selectedTeamName}
          selectedMeetingKey={selectedMeetingKey}
          onDriverSelect={handleDriverSelect}
          onTeamSelect={handleTeamSelect}
          onMeetingSelect={handleMeetingSelect}
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
          isPublicAccessRestricted={isPublicAccessRestricted}
          sourceAccessRetrySeconds={sourceAccessRetrySeconds}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-graphite">
      {!bootComplete && (
        <BootSequence onComplete={() => setBootComplete(true)} />
      )}

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
         isPublicAccessRestricted={isPublicAccessRestricted}
         sourceAccessRetrySeconds={sourceAccessRetrySeconds}
         activeSection={activeSection}
         onNavigate={setActiveSection}
        >
          <div className="space-y-4">
            <ActiveContextDock
              data={data}
              selectedDriverNumber={selectedDriverNumber}
              selectedTeamName={selectedTeamName}
              selectedMeetingKey={selectedMeetingKey}
              isFromCache={isFromCache}
              isPublicAccessRestricted={isPublicAccessRestricted}
              onNavigate={setActiveSection}
              onClearContext={handleClearContext}
            />

            {renderMainContent()}
          </div>
        </AppShell>
      </div>
    </div>
  );
}

export default App;
