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
isPublicAccessRestricted: boolean;
sourceAccessRetrySeconds: number;
isAnalyticsLoading: boolean;
  analyticsProgress: DataIntegrityPanelProps['analyticsProgress'];
  refreshData: () => void;
  loadAnalyticsArchive: DataIntegrityPanelProps['onLoadAnalytics'];
  onDriverSelect: (driverNumber: number) => void;
  onTeamSelect: (teamName: string) => void;
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
isPublicAccessRestricted,
sourceAccessRetrySeconds,
isAnalyticsLoading,
  analyticsProgress,
  refreshData,
  loadAnalyticsArchive,
  onDriverSelect,
  onTeamSelect,
}: ChampionshipPageProps) {
  return (
    <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-4 xl:grid-cols-12">
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
      <div className="space-y-4 xl:col-span-8">
        <DriverStandingsPanel
          data={data}
          isLoading={isLoading}
          onDriverSelect={onDriverSelect}
        />

        <ForecastEnginePanel
          data={data}
          isLoading={isLoading}
          onDriverSelect={onDriverSelect}
          onTeamSelect={onTeamSelect}
        />

        <RaceTimeline
          data={data}
          isLoading={isLoading}
        />
      </div>

      {/* Supporting analysis */}
      <div className="space-y-4 xl:col-span-4">
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
          isPublicAccessRestricted={isPublicAccessRestricted}
sourceAccessRetrySeconds={sourceAccessRetrySeconds}
        />
      </div>

      {/* Footer */}
      <div className="pb-4 pt-8 xl:col-span-12">
        <p className="mx-auto max-w-xl text-center text-[10px] tracking-wider text-white/20">
          {DISCLAIMER_TEXT}
        </p>
      </div>
    </div>
  );
}