import { MetricCard } from '../MetricCard';
import type { PopulationMetrics, PopulationStatsBase } from '../../types';
import { formatHouseholds, formatNumber, formatPopulation, formatPercent } from '../../utils/formatters';

interface PopulationMetricsCardsProps {
  stats?: PopulationStatsBase;
  metrics?: PopulationMetrics;
}

export function PopulationMetricsCards({ stats, metrics }: PopulationMetricsCardsProps) {
  return (
    <div className="metric-grid">
      <MetricCard label="총인구" value={formatPopulation(stats?.totalPopulation)} />
      <MetricCard label="세대수" value={formatHouseholds(stats?.households)} />
      <MetricCard
        label="평균 세대원수"
        value={metrics?.averageHouseholdSize !== undefined ? `${metrics.averageHouseholdSize.toFixed(2)}명` : '데이터 없음'}
      />
      <MetricCard
        label="1인가구 비율"
        value={formatPercent(metrics?.onePersonHouseholdRatio)}
        helper={
          stats?.householdComposition
            ? `${formatNumber(stats.householdComposition.onePerson)}세대 / ${formatNumber(stats.householdComposition.totalHouseholds)}세대`
            : '세대원수별 세대수 데이터 없음'
        }
      />
    </div>
  );
}
