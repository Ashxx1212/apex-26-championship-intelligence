import { useState } from 'react';
import {
  LayoutDashboard,
  Trophy,
  Users,
  BarChart3,
  Map,
  FlaskConical,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
}

const navItems: NavItem[] = [
  {
    id: 'command',
    label: 'COMMAND CENTRE',
    icon: LayoutDashboard,
    section: 'OPERATIONS',
  },
  {
    id: 'championship',
    label: 'CHAMPIONSHIP',
    icon: Trophy,
    section: 'ANALYSIS',
  },
  {
    id: 'driver-intel',
    label: 'DRIVER INTEL',
    icon: Users,
    section: 'ANALYSIS',
  },
  {
    id: 'team',
    label: 'TEAM PERFORMANCE',
    icon: BarChart3,
    section: 'ANALYSIS',
  },
  {
    id: 'circuit',
    label: 'CIRCUIT MATRIX',
    icon: Map,
    section: 'ANALYSIS',
  },
  {
    id: 'scenario',
    label: 'SCENARIO LAB',
    icon: FlaskConical,
    section: 'MODELS',
  },
  {
    id: 'notes',
    label: 'MODEL NOTES',
    icon: FileText,
    section: 'MODELS',
  },
];

interface SideNavigationProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

export function SideNavigation({
  activeSection,
  onNavigate,
}: SideNavigationProps) {
  const [collapsed, setCollapsed] = useState(false);

  let previousSection = '';

  return (
    <nav
      className={`
        relative flex h-full flex-col border-r border-white/[0.09]
        bg-gradient-to-b from-[#090a0d]/95 via-graphite/95 to-[#08090b]/95
        shadow-[20px_0_45px_rgba(0,0,0,0.22)]
        backdrop-blur-xl
        transition-[width] duration-300 ease-out
        ${collapsed ? 'w-[76px]' : 'w-[272px]'}
      `}
    >
      {/* Wordmark */}
      <div className="relative flex h-[76px] shrink-0 items-center border-b border-white/[0.09] px-5">
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-cyan/40 via-cyan/10 to-transparent" />

        <div
          className={`
            flex items-center gap-3
            ${collapsed ? 'mx-auto' : ''}
          `}
        >
          <div className="relative">
            <div className="absolute -inset-2 rounded-full bg-cyan/[0.05] blur-md" />
            <span className="relative text-[22px] font-black tracking-[0.22em] text-white">
              {collapsed ? 'A' : 'APEX'}
            </span>
          </div>

          {!collapsed && (
            <span className="border-l border-white/10 pl-3 text-[11px] font-bold tracking-[0.16em] text-cyan">
              26
            </span>
          )}
        </div>

        {!collapsed && (
          <div className="absolute bottom-3 left-5 flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-cyan shadow-[0_0_9px_rgba(0,255,255,0.7)]" />
            <span className="text-[8px] tracking-[0.2em] text-white/25">
              INTELLIGENCE OS
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const showSectionLabel = !collapsed && item.section !== previousSection;

          previousSection = item.section;

          return (
            <div key={item.id}>
              {showSectionLabel && (
                <div className="mb-2 mt-5 px-3 first:mt-0">
                  <span className="text-[8px] font-semibold tracking-[0.24em] text-white/20">
                    {item.section}
                  </span>
                </div>
              )}

              <button
                onClick={() => onNavigate(item.id)}
                title={collapsed ? item.label : undefined}
                className={`
                  group relative mb-1 flex w-full items-center gap-3 overflow-hidden
                  rounded-sm px-3 py-3 text-left
                  transition-all duration-200
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-crimson/[0.13] via-crimson/[0.045] to-transparent text-white'
                      : 'text-white/42 hover:bg-white/[0.035] hover:text-white/85'
                  }
                `}
              >
                {isActive && (
                  <>
                    <div className="absolute inset-y-2 left-0 w-[2px] bg-crimson shadow-[0_0_14px_rgba(220,20,60,0.8)]" />
                    <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-crimson/35 via-transparent to-transparent" />
                  </>
                )}

                <div
                  className={`
                    relative flex h-8 w-8 shrink-0 items-center justify-center rounded-sm
                    transition-colors duration-200
                    ${
                      isActive
                        ? 'bg-crimson/10 text-crimson'
                        : 'text-white/35 group-hover:bg-cyan/[0.06] group-hover:text-cyan'
                    }
                  `}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </div>

                {!collapsed && (
                  <span className="relative truncate text-[11px] font-semibold tracking-[0.1em]">
                    {item.label}
                  </span>
                )}

                {isActive && !collapsed && (
                  <span className="ml-auto text-[8px] tracking-[0.18em] text-crimson/80">
                    ACTIVE
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* System status */}
      <div className="relative shrink-0 border-t border-white/[0.09] px-4 py-4">
        <div
          className={`
            flex items-center gap-2.5
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <div className="relative h-2 w-2">
            <div className="absolute inset-0 rounded-full bg-cyan shadow-[0_0_10px_rgba(0,255,255,0.9)]" />
            <div className="absolute inset-0 rounded-full bg-cyan/50 animate-ping" />
          </div>

          {!collapsed && (
            <div>
              <p className="text-[9px] font-medium tracking-[0.16em] text-white/55">
                SYSTEM ACTIVE
              </p>
              <p className="mt-0.5 text-[8px] tracking-[0.12em] text-white/20">
                VERIFIED DATA LAYER
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse control */}
      <button
        onClick={() => setCollapsed((value) => !value)}
        className="
          absolute -right-3 top-[92px] z-30 flex h-7 w-7 items-center justify-center
          rounded-full border border-white/15 bg-[#111319] text-white/40
          shadow-lg transition-all duration-200
          hover:border-cyan/50 hover:text-cyan
        "
        title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </nav>
  );
}