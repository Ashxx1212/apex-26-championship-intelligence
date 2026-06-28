import { Database } from 'lucide-react';

interface DataStatusBadgeProps {
  status: 'online' | 'offline' | 'awaiting_verified_ingestion';
  compact?: boolean;
}

export function DataStatusBadge({ status, compact = false }: DataStatusBadgeProps) {
  const statusConfig = {
    online: {
      color: 'cyan',
      text: 'ONLINE',
    },
    offline: {
      color: 'red-500',
      text: 'OFFLINE',
    },
    awaiting_verified_ingestion: {
      color: 'amber',
      text: 'AWAITING DATA',
    },
  };

  const config = statusConfig[status];

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div
          className={`w-1.5 h-1.5 rounded-full bg-${config.color}`}
          style={{
            boxShadow: `0 0 4px var(--color-${config.color}, rgb(251, 191, 36))`,
          }}
        />
        <span className="text-[10px] tracking-wider text-white/40">
          {config.text}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border border-white/10 rounded-sm">
      <Database className="w-3 h-3 text-white/40" />
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full bg-${config.color}`}
          style={{
            boxShadow: `0 0 6px var(--color-${config.color}, rgb(251, 191, 36))`,
          }}
        />
        <span className="text-[10px] tracking-wider text-white/60 uppercase">
          {config.text}
        </span>
      </div>
    </div>
  );
}
