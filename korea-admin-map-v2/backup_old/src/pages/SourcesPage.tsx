import { getDataSourceStatuses } from '../services/dataSourceStatusService'
import { SourceBadge } from '../components/common/SourceBadge'

export const SourcesPage = () => {
  const statuses = getDataSourceStatuses()

  return (
    <div className="page-grid">
      <section className="page-hero">
        <div className="panel hero-card">
          <span className="hero-kicker">데이터 소스 상태</span>
          <h1 className="hero-title">Boundary / Population / Election</h1>
          <p className="hero-description">현재 선택된 sourceType, 상태 코드, fallback reason, request url을 한 화면에서 확인합니다.</p>
        </div>
      </section>
      <section className="panel panel-body">
        <div className="status-grid">
          {statuses.map((status) => (
            <div className="status-card" key={status.sourceKey}>
              <div className="status-label">{status.sourceKey}</div>
              <div className="status-value">
                <SourceBadge sourceType={status.currentSourceType} />
              </div>
              <div className="source-meta">
                <div>
                  <strong>status code:</strong> {status.statusCode ?? '-'}
                </div>
                <div>
                  <strong>fallback reason:</strong> {status.fallbackReason}
                </div>
                <div>
                  <strong>request url:</strong> {status.requestUrl ?? '-'}
                </div>
                <div>
                  <strong>normalized count:</strong> {status.normalizedItemCount}
                </div>
                <div>
                  <strong>selected reason:</strong> {status.selectedSourceReason}
                </div>
                <div>
                  <strong>last request:</strong> {status.lastRequestTimestamp}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
