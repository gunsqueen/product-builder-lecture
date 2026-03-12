import type { DataSourceBadgeInfo } from '../types';

interface SourceBadgeRowProps {
  items: DataSourceBadgeInfo[];
}

export function SourceBadgeRow({ items }: SourceBadgeRowProps) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="source-badge-row">
      {items.map((item) => {
        const sourceLabel = item.resolvedSource === 'real' ? 'real' : 'snapshot';
        return (
          <span
            className={item.fallbackUsed ? 'source-badge source-badge-fallback' : 'source-badge'}
            key={`${item.label}-${item.resolvedSource}`}
            title={item.fallbackReason || item.endpoint || undefined}
          >
            {item.label}: {sourceLabel}
            {item.fallbackUsed ? ' fallback' : ''}
          </span>
        );
      })}
    </div>
  );
}
