import type { ElectionResult } from '@/types/election'
import { formatNumber, formatPercent } from '@/utils/formatters'

interface ElectionSummaryCardProps {
  title: string
  result: ElectionResult | null
}

export function ElectionSummaryCard({ title, result }: ElectionSummaryCardProps) {
  return (
    <article className="panel election-summary-card">
      <span className="eyebrow">Election</span>
      <h2>{title}</h2>
      {result ? (
        <>
          <p>{result.candidateName}</p>
          <p>{result.partyName}</p>
          <p>득표율 {formatPercent(result.voteRate)}</p>
          <p>득표수 {formatNumber(result.voteCount)}표</p>
          <p className="helper-text">
            {result.electionName} · {result.sourceType} · {result.sourceDate}
          </p>
        </>
      ) : (
        <p>표시할 선거 데이터가 없습니다.</p>
      )}
    </article>
  )
}
