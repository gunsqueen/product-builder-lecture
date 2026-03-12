import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  description?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
  children: ReactNode;
}

export function ChartCard({ title, description, emptyMessage, isEmpty = false, children }: ChartCardProps) {
  return (
    <section className="content-card">
      <div className="section-header">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {isEmpty ? <p className="inline-note">{emptyMessage ?? '데이터 없음'}</p> : children}
    </section>
  );
}
