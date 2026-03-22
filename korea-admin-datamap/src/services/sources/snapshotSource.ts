import { mockSource } from '@/services/sources/mockSource'
import type { AdminDataSource } from '@/services/sources/types'

export const snapshotSource: AdminDataSource = {
  ...mockSource,
  name: 'snapshot',
}
