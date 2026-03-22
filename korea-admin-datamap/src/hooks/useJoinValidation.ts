import { useEffect, useMemo } from 'react'
import { logJoinValidation, validateBoundaryJoin } from '@/utils/joinValidation'
import type { BoundaryFeatureCollection, JoinValidationResult } from '@/types/admin'

interface JoinRecord {
  adminCode: string
}

interface UseJoinValidationInput<RecordShape extends JoinRecord> {
  datasetName: string
  boundaryName: string
  boundaries: BoundaryFeatureCollection | null
  records: RecordShape[]
}

export const useJoinValidation = <RecordShape extends JoinRecord>({
  datasetName,
  boundaryName,
  boundaries,
  records,
}: UseJoinValidationInput<RecordShape>): JoinValidationResult =>
  useMemo(
    () =>
      validateBoundaryJoin({
        datasetName,
        boundaryName,
        boundaries,
        records,
      }),
    [boundaries, boundaryName, datasetName, records],
  )

export const useJoinValidationLogger = (result: JoinValidationResult) => {
  useEffect(() => {
    logJoinValidation(result)
  }, [result])
}
