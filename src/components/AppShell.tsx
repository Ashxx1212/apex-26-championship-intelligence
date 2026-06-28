import { ReactNode, useState } from 'react';
import { SideNavigation } from './SideNavigation';
import { TopStatusBar } from './TopStatusBar';
import type { DataSourceState, AppError } from '../types/app';

interface AppShellProps {
  children: ReactNode;
  isLoading: boolean;
  error: AppError | null;
  dataSource: string;
  completedRounds: number;
  totalRounds: number;
  lastSync: string | null;
  onRefresh: () => void;
  loadingMessage?: string;
  cooldownSeconds: number;
  sourceState: DataSourceState;
  isFromCache: boolean;
  activeSection: string;
  onNavigate: (section: string) => void;
}

export function AppShell({
  children,
  isLoading,
  error,
  dataSource,
  completedRounds,
  totalRounds,
  lastSync,
  onRefresh,
  loadingMessage,
  cooldownSeconds,
  sourceState,
  isFromCache,
  activeSection,
  onNavigate,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-graphite">
      {/* Side navigation */}
      <SideNavigation activeSection={activeSection} onNavigate={onNavigate} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopStatusBar
          isLoading={isLoading}
          error={error}
          dataSource={dataSource}
          completedRounds={completedRounds}
          totalRounds={totalRounds}
          lastSync={lastSync}
          onRefresh={onRefresh}
          loadingMessage={loadingMessage}
          cooldownSeconds={cooldownSeconds}
          sourceState={sourceState}
          isFromCache={isFromCache}
        />

        <main className="flex-1 overflow-y-auto bg-graphite relative">
          {/* Telemetry grid texture overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />

          {/* Content */}
          <div className="relative p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
