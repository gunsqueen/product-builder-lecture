interface ErrorStateProps {
  title?: string
  message: string
  className?: string
}

export function ErrorState({
  title = '오류',
  message,
  className,
}: ErrorStateProps) {
  return (
    <div
      aria-live="assertive"
      className={className ? `panel state-card ${className}` : 'panel state-card'}
      role="alert"
    >
      <span className="state-badge state-badge-error">Error</span>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}

