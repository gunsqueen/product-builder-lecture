import clsx from 'clsx'

export const SourceBadge = ({ sourceType }: { sourceType: 'real' | 'snapshot' | 'mock' }) => (
  <span className={clsx('badge', sourceType)}>{sourceType}</span>
)
