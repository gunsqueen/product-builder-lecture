import { getDataSourceStatuses } from '../services/dataSourceStatusService'

export const SourcesPage = () => {
  const statuses = getDataSourceStatuses()

  return (
    <section className="map-card">
      <div className="map-header">
        <div>
          <span className="eyebrow">sources</span>
          <h2>데이터 소스 상태</h2>
          <p>boundary / population / election 현재 선택 상태</p>
        </div>
      </div>
      <div className="status-grid">
        {statuses.map((status) => (
          <div className="status-card" key={status.sourceKey}>
            <strong>{status.sourceKey}</strong>
            <span>sourceType: {status.currentSourceType}</span>
            <span>status code: {status.statusCode ?? '-'}</span>
            <span>fallback reason: {status.fallbackReason}</span>
            <span>request url: {status.requestUrl ?? '-'}</span>
            <span>timestamp: {status.lastRequestTimestamp}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
