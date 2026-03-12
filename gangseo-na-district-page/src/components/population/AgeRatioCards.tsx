import { MetricCard } from '../MetricCard';
import type { AgeRatioMetrics } from '../../types';
import { formatPercent } from '../../utils/formatters';

interface AgeRatioCardsProps {
  metrics?: AgeRatioMetrics;
}

export function AgeRatioCards({ metrics }: AgeRatioCardsProps) {
  return (
    <div className="metric-grid metric-grid-three">
      <MetricCard label="10~19세 비율" value={formatPercent(metrics?.age10to19Ratio)} />
      <MetricCard label="2030 비율" value={formatPercent(metrics?.age2030Ratio)} helper="20~39세 인구 비율" />
      <MetricCard label="65세 이상 비율" value={formatPercent(metrics?.senior65Ratio)} />
    </div>
  );
}
