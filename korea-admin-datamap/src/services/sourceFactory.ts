import { APP_CONFIG } from '@/config/app'
import { mockSource } from '@/services/sources/mockSource'
import { realApiSource } from '@/services/sources/realApiSource'
import { snapshotSource } from '@/services/sources/snapshotSource'
import type { AdminDataSource } from '@/services/sources/types'

export const getActiveSource = (): AdminDataSource => {
  switch (APP_CONFIG.dataSourceMode) {
    case 'snapshot':
      return snapshotSource
    case 'real':
      return realApiSource
    case 'mock':
    default:
      return mockSource
  }
}
