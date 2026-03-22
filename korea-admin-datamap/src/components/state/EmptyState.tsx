interface EmptyStateProps {
  title?: string
  message: string
  className?: string
}

export function EmptyState({
  title = '데이터 없음',
  message,
  className,
}: EmptyStateProps) {
  return (
    <div className={className ? `panel state-card ${className}` : 'panel state-card'}>
      <span className="state-badge state-badge-empty">Empty</span>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}

