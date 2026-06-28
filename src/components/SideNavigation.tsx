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
  Lock,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  locked: boolean;
}

const navItems: NavItem[] = [
  { id: 'command', label: 'COMMAND CENTRE', icon: LayoutDashboard, locked: false },
  { id: 'championship', label: 'CHAMPIONSHIP', icon: Trophy, locked: false },
  { id: 'driver-intel', label: 'DRIVER INTEL', icon: Users, locked: false },
  { id: 'team', label: 'TEAM PERFORMANCE', icon: BarChart3, locked: true },
  { id: 'circuit', label: 'CIRCUIT MATRIX', icon: Map, locked: true },
  { id: 'scenario', label: 'SCENARIO LAB', icon: FlaskConical, locked: true },
  { id: 'notes', label: 'MODEL NOTES', icon: FileText, locked: true },
];

interface SideNavigationProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onLockedClick?: (label: string) => void;
}

export function SideNavigation({ activeSection, onNavigate, onLockedClick }: SideNavigationProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      className={`
        relative flex flex-col h-full border-r border-white/10
        bg-gradient-to-b from-graphite/95 to-graphite-light/95
        backdrop-blur-sm
        transition-all duration-300
        ${collapsed ? 'w-16' : 'w-56'}
      `}
    >
      {/* APEX wordmark */}
      <div className="flex items-center justify-center h-16 border-b border-white/10">
        <div className="relative flex items-center gap-2">
          <span className="text-xl font-black tracking-[0.2em] text-white">
            {collapsed ? 'A' : 'APEX'}
          </span>
          <span className="text-cyan text-xs font-bold">26</span>
        </div>
      </div>

      {/* Navigation items */}
      <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          if (item.locked) {
            return (
              <button
                key={item.id}
                onClick={() => onLockedClick?.(item.label)}
                className="group relative flex items-center w-full gap-3 px-4 py-3 text-white/30 cursor-not-allowed transition-all duration-200"
                title="Module locked - in development"
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span
                  className={`
                    text-xs tracking-wider font-medium
                    transition-opacity duration-200
                    ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}
                  `}
                >
                  {item.label}
                </span>
                {!collapsed && (
                  <Lock className="w-3 h-3 ml-auto text-white/20" />
                )}
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                group relative flex items-center w-full gap-3 px-4 py-3
                transition-all duration-200
                ${isActive ? 'text-white' : 'text-white/50 hover:text-white/80'}
              `}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-[2px] bg-crimson" />
              )}

              {/* Scanning line for active */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-crimson/5 to-transparent" />
              )}

              <Icon
                className={`
                  w-5 h-5 flex-shrink-0
                  ${isActive ? 'text-crimson' : 'group-hover:text-cyan'}
                  transition-colors
                `}
              />
              <span
                className={`
                  text-xs tracking-wider font-medium
                  transition-opacity duration-200
                  ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}
                `}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* System status */}
      <div className="p-4 border-t border-white/10">
        <div
          className={`
            flex items-center gap-2 text-xs
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-cyan/50 animate-ping" />
          </div>
          <span
            className={`
              text-white/40 tracking-wider
              transition-opacity duration-200
              ${collapsed ? 'hidden' : ''}
            `}
          >
            SYSTEM ACTIVE
          </span>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-graphite border border-white/20 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:border-white/40 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </nav>
  );
}
