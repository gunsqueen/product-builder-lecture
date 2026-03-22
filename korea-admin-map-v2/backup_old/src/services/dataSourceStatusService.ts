import type { DataSourceStatus } from '../types/dataSource'

const statusMap = new Map<DataSourceStatus['sourceKey'], DataSourceStatus>()

const now = () => new Date().toISOString()

export const updateDataSourceStatus = (status: Omit<DataSourceStatus, 'lastRequestTimestamp'> & { lastRequestTimestamp?: string }) => {
  statusMap.set(status.sourceKey, {
    ...status,
    lastRequestTimestamp: status.lastRequestTimestamp ?? now(),
  })
}

export const getDataSourceStatuses = (): DataSourceStatus[] => {
  const defaults: DataSourceStatus[] = [
    {
      sourceKey: 'boundary',
      currentSourceType: 'snapshot',
      requestedMode: 'real',
      requestSent: false,
      responseReceived: false,
      parseSuccess: false,
      normalizerSuccess: false,
      normalizedItemCount: 0,
      fallbackReason: 'none',
      selectedSourceReason: '아직 요청되지 않았습니다.',
      lastRequestTimestamp: now(),
    },
    {
      sourceKey: 'population',
      currentSourceType: 'snapshot',
      requestedMode: 'real',
      requestSent: false,
      responseReceived: false,
      parseSuccess: false,
      normalizerSuccess: false,
      normalizedItemCount: 0,
      fallbackReason: 'none',
      selectedSourceReason: '아직 요청되지 않았습니다.',
      lastRequestTimestamp: now(),
    },
    {
      sourceKey: 'election',
      currentSourceType: 'snapshot',
      requestedMode: 'real',
      requestSent: false,
      responseReceived: false,
      parseSuccess: false,
      normalizerSuccess: false,
      normalizedItemCount: 0,
      fallbackReason: 'none',
      selectedSourceReason: '아직 요청되지 않았습니다.',
      lastRequestTimestamp: now(),
    },
  ]

  return defaults.map((item) => statusMap.get(item.sourceKey) ?? item)
}
