interface SourceMetaItem {
  label: string
  sourceType?: string | null
  sourceDate?: string | null
  description?: string
}

interface SourceMetaGridProps {
  title?: string
  items: SourceMetaItem[]
}

export function SourceMetaGrid({
  title = '데이터 기준',
  items,
}: SourceMetaGridProps) {
  const visibleItems = items.filter((item) => item.sourceType || item.sourceDate || item.description)

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <article className="panel source-meta-panel">
      <div className="panel-head">
        <span className="eyebrow">Data Provenance</span>
        <h2>{title}</h2>
      </div>
      <div className="source-meta-grid">
        {visibleItems.map((item) => (
          <div className="source-meta-card" key={item.label}>
            <strong>{item.label}</strong>
            <p>
              <span className={`source-type-badge source-type-${item.sourceType ?? 'snapshot'}`}>
                {(item.sourceType ?? 'snapshot').toUpperCase()}
              </span>
            </p>
            <p>기준일 {item.sourceDate ?? 'n/a'}</p>
            {item.description ? <p className="helper-text">{item.description}</p> : null}
          </div>
        ))}
      </div>
    </article>
  )
}

