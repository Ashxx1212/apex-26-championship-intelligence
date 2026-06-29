import { Database } from 'lucide-react';

interface DataStatusBadgeProps {
  status:
    | 'online'
    | 'offline'
    | 'awaiting_verified_ingestion'
    | 'archive_active'
    | 'access_restricted';
  compact?: boolean;
}

const statusConfig = {
  online: {
    dot: 'bg-cyan',
    text: 'ONLINE',
    shadow: '0 0 6px rgba(0, 212, 255, 0.75)',
  },
  offline: {
    dot: 'bg-red-500',
    text: 'OFFLINE',
    shadow: '0 0 6px rgba(239, 68, 68, 0.7)',
  },
  awaiting_verified_ingestion: {
    dot: 'bg-amber',
    text: 'AWAITING DATA',
    shadow: '0 0 6px rgba(245, 158, 11, 0.75)',
  },
  archive_active: {
    dot: 'bg-green-400',
    text: 'ARCHIVE ACTIVE',
    shadow: '0 0 6px rgba(74, 222, 128, 0.72)',
  },
  access_restricted: {
    dot: 'bg-amber',
    text: 'ACCESS RESTRICTED',
    shadow: '0 0 6px rgba(245, 158, 11, 0.78)',
  },
};

export function DataStatusBadge({
  status,
  compact = false,
}: DataStatusBadgeProps) {
  const config = statusConfig[status];

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div
          className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
          style={{ boxShadow: config.shadow }}
        />
        <span className="text-[10px] tracking-wider text-white/40">
          {config.text}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-sm border border-white/10 bg-white/[0.02] px-3 py-1.5">
      <Database className="h-3 w-3 text-white/40" />
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${config.dot}`}
          style={{ boxShadow: config.shadow }}
        />
        <span className="text-[10px] tracking-wider text-white/60 uppercase">
          {config.text}
        </span>
      </div>
    </div>
  );
}
