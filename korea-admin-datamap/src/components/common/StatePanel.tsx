import { EmptyState } from '@/components/state/EmptyState'
import { ErrorState } from '@/components/state/ErrorState'
import { LoadingState } from '@/components/state/LoadingState'

interface LoadingPanelProps {
  message?: string
  className?: string
}

export function LoadingPanel({
  message = '데이터를 불러오는 중입니다.',
  className,
}: LoadingPanelProps) {
  return <LoadingState className={className} title="불러오는 중" message={message} />
}

interface ErrorPanelProps {
  message: string
  className?: string
}

export function ErrorPanel({ message, className }: ErrorPanelProps) {
  return <ErrorState className={className} title="오류" message={message} />
}

interface EmptyPanelProps {
  message: string
  className?: string
}

export function EmptyPanel({ message, className }: EmptyPanelProps) {
  return <EmptyState className={className} title="데이터 없음" message={message} />
}
