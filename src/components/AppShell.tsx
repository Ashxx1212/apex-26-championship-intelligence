import type { ReactNode } from 'react';
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
    <div className="relative flex h-screen overflow-hidden bg-black text-white">
      {/* Atmospheric background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_4%,rgba(0,255,255,0.045),transparent_30%),radial-gradient(circle_at_16%_95%,rgba(220,20,60,0.035),transparent_28%)]" />

        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        <div className="absolute inset-x-0 top-0 h-px bg-cyan/25" />
      </div>

      {/* Navigation shell */}
      <div className="relative z-20">
        <SideNavigation
          activeSection={activeSection}
          onNavigate={onNavigate}
        />
      </div>

      {/* Main application shell */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
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

        <main className="relative flex-1 overflow-y-auto overflow-x-hidden">
          {/* Page frame */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.015] to-transparent" />
            <div className="absolute right-0 top-0 h-full w-px bg-white/[0.035]" />
          </div>

          <div className="relative min-h-full p-4 md:p-6 lg:p-7">
            <div className="mx-auto w-full max-w-[1880px]">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}