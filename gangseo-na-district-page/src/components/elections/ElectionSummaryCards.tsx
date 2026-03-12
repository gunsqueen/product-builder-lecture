import { MetricCard } from '../MetricCard';
import type { ElectionResult } from '../../types';
import { formatNumber, formatPercent } from '../../utils/formatters';

interface ElectionSummaryCardsProps {
  election?: ElectionResult;
}

export function ElectionSummaryCards({ election }: ElectionSummaryCardsProps) {
  return (
    <div className="metric-grid metric-grid-three">
      <MetricCard label="최근 선거" value={election?.electionName ?? '데이터 없음'} />
      <MetricCard label="투표율" value={formatPercent(election?.turnout)} />
      <MetricCard
        label="1위"
        value={election?.results[0]?.label ?? '데이터 없음'}
        helper={election?.results[0] ? `${election.results[0].share.toFixed(1)}%` : undefined}
      />
      <MetricCard label="총투표수" value={election ? `${formatNumber(election.totalVotes)}표` : '데이터 없음'} />
    </div>
  );
}
