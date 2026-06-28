import type { ComponentProps } from 'react';
import { ChampionshipHero } from '../../components/ChampionshipHero';
import { ConstructorsPanel } from '../../components/ConstructorsPanel';
import { DataIntegrityPanel } from '../../components/DataIntegrityPanel';
import { DriverStandingsPanel } from '../../components/DriverStandingsPanel';
import { ForecastEnginePanel } from '../../components/ForecastEnginePanel';
import { MethodologyPanel } from '../../components/MethodologyPanel';
import { RaceTimeline } from '../../components/RaceTimeline';
import { DISCLAIMER_TEXT } from '../../config/appConfig';
import type { AppError, DataSourceState } from '../../types/app';
import type { ChampionshipDataSnapshot } from '../../types/f1';

type DataIntegrityPanelProps = ComponentProps<typeof DataIntegrityPanel>;

interface ChampionshipPageProps {
  data: ChampionshipDataSnapshot | null;
  isLoading: boolean;
  error: AppError | null;
  loadingMessage?: string;
  sourceState: DataSourceState;
  isFromCache: boolean;
  lastSyncTime: string | null;
  cooldownSeconds: number;
  isAnalyticsLoading: boolean;
  analyticsProgress: DataIntegrityPanelProps['analyticsProgress'];
  refreshData: () => void;
  loadAnalyticsArchive: DataIntegrityPanelProps['onLoadAnalytics'];
  onDriverSelect: (driverNumber: number) => void;
}

export function ChampionshipPage({
  data,
  isLoading,
  error,
  loadingMessage,
  sourceState,
  isFromCache,
  lastSyncTime,
  cooldownSeconds,
  isAnalyticsLoading,
  analyticsProgress,
  refreshData,
  loadAnalyticsArchive,
  onDriverSelect,
}: ChampionshipPageProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 max-w-[1800px] mx-auto">
      {/* Season hero */}
      <div className="xl:col-span-12">
        <ChampionshipHero
          isLoading={isLoading && !data}
          error={error && !error.canShowCachedData ? error : null}
          data={data}
          loadingMessage={loadingMessage}
          sourceState={sourceState}
        />
      </div>

      {/* Main season analysis */}
      <div className="xl:col-span-8 space-y-4">
        <DriverStandingsPanel
          data={data}
          isLoading={isLoading}
          onDriverSelect={onDriverSelect}
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

      {/* Supporting analysis */}
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
          onRefresh={refreshData}
          onLoadAnalytics={loadAnalyticsArchive}
          isAnalyticsLoading={isAnalyticsLoading}
          analyticsProgress={analyticsProgress}
          cooldownSeconds={cooldownSeconds}
        />
      </div>

      {/* Footer */}
      <div className="xl:col-span-12 pt-8 pb-4">
        <p className="text-center text-[10px] text-white/20 tracking-wider max-w-xl mx-auto">
          {DISCLAIMER_TEXT}
        </p>
      </div>
    </div>
  );
}