interface LoadingStateProps {
  title?: string
  message?: string
  className?: string
}

export function LoadingState({
  title = '불러오는 중',
  message = '데이터를 불러오고 있습니다.',
  className,
}: LoadingStateProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={className ? `panel state-card ${className}` : 'panel state-card'}
      role="status"
    >
      <span className="state-badge state-badge-loading">Loading</span>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}

