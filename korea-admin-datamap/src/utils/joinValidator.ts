import type {
  AdminCode,
  AdminLevel,
  BoundaryFeatureCollection,
  JoinValidationResult,
} from '@/types/admin'
import { APP_CONFIG } from '@/config/app'
import { getAdminLevelFromCode, getParentAdminCode } from '@/utils/adminCode'

interface JoinValidationInput<
  RecordShape extends { adminCode: string; adminLevel?: AdminLevel; sourceType?: string },
> {
  datasetName: string
  boundaryName: string
  contextLabel?: string
  boundaries: BoundaryFeatureCollection | null
  records: RecordShape[]
}

interface DatasetCodeJoinInput {
  datasetName: string
  boundaryName: string
  contextLabel?: string
  referenceName: string
  boundaryCodes: string[]
  records: Array<{ adminCode: string; adminLevel?: AdminLevel; sourceType?: string }>
  referenceCodes: string[]
}

interface BoundaryAdminJoinInput {
  boundaryName: string
  contextLabel?: string
  boundaries: BoundaryFeatureCollection | null
  adminRecords: Array<{
    code: string
    parentCode?: string
  }>
}

interface ThematicMapJoinInput {
  metricKey: string
  boundaryName: string
  boundaries: BoundaryFeatureCollection | null
  records: Array<{ adminCode: string; adminLevel?: AdminLevel; sourceType?: string }>
  missingPopulationCodes: string[]
  missingElectionCodes: string[]
  calculationUnavailableCodes: string[]
}

interface TimeSeriesJoinInput {
  datasetName: string
  metricKey: string
  records: Array<{ adminCode: string; adminLevel?: AdminLevel; sourceType?: string; year: number }>
  expectedAdminCode: string
  expectedAdminLevel: AdminLevel
}

const isDefinedString = (value: string | undefined): value is string => Boolean(value)

const toSample = (values: string[] | undefined, limit = 20) => {
  const resolved = values ?? []
  return {
    total: resolved.length,
    sample: resolved.slice(0, limit),
  }
}

export const validateAdminJoin = <
  RecordShape extends { adminCode: string; adminLevel?: AdminLevel; sourceType?: string },
>({
  datasetName,
  boundaryName,
  contextLabel,
  boundaries,
  records,
}: JoinValidationInput<RecordShape>): JoinValidationResult => {
  const boundaryCodes = boundaries?.features.map((feature) => feature.properties.code) ?? []
  const adminCodes = records.map((record) => record.adminCode)
  const boundaryCodeSet = new Set(boundaryCodes)
  const adminCodeSet = new Set(adminCodes)
  const boundaryLevels = new Map(
    (boundaries?.features ?? []).map((feature) => [
      feature.properties.code,
      feature.properties.level,
    ]),
  )
  const recordSourceTypes = [
    ...new Set(records.map((record) => record.sourceType).filter(isDefinedString)),
  ]
  const boundarySourceType = boundaries?.metadata?.sourceType

  const missingFeatureCodes = adminCodes.filter((code) => !boundaryCodeSet.has(code))
  const missingRecordCodes = [...boundaryCodeSet].filter(
    (code) => !adminCodeSet.has(code),
  )
  const adminLevelMismatchCodes = records
    .filter((record) => {
      const boundaryLevel = boundaryLevels.get(record.adminCode)
      return Boolean(boundaryLevel && record.adminLevel && boundaryLevel !== record.adminLevel)
    })
    .map((record) => record.adminCode)
  const parentCodeMismatchCodes = (boundaries?.features ?? [])
    .filter((feature) => {
      const expectedParentCode =
        feature.properties.adminLevel === 'province'
          ? undefined
          : getParentAdminCode(feature.properties.adminCode as AdminCode)

      return Boolean(
        expectedParentCode &&
          feature.properties.parentCode &&
          feature.properties.parentCode !== expectedParentCode,
      )
    })
    .map((feature) => feature.properties.adminCode)
  const status =
    boundaryCodes.length === 0
      ? 'skipped'
      : missingFeatureCodes.length === 0 &&
          missingRecordCodes.length === 0 &&
          adminLevelMismatchCodes.length === 0 &&
          parentCodeMismatchCodes.length === 0
        ? 'valid'
        : 'mismatch'
  const mixedSourceWarning =
    recordSourceTypes.length > 1
      ? `Mixed record source types detected: ${recordSourceTypes.join(', ')}`
      : boundarySourceType &&
          recordSourceTypes.length === 1 &&
          recordSourceTypes[0] !== boundarySourceType
        ? `Boundary source (${boundarySourceType}) and record source (${recordSourceTypes[0]}) are mixed`
        : undefined

  return {
    datasetName,
    boundaryName,
    contextLabel,
    status,
    boundaryCodes,
    adminCodes,
    adminLevelMismatchCodes,
    parentCodeMismatchCodes,
    recordSourceTypes,
    boundarySourceType,
    mixedSourceWarning,
    matchedCount: records.length - missingFeatureCodes.length,
    boundaryCount: boundaryCodes.length,
    recordCount: records.length,
    missingFeatureCodes,
    missingRecordCodes,
    isValid: status === 'valid',
  }
}

export const validateDatasetCodeJoin = ({
  datasetName,
  boundaryName,
  contextLabel,
  referenceName,
  boundaryCodes,
  records,
  referenceCodes,
}: DatasetCodeJoinInput): JoinValidationResult => {
  const boundaryCodeSet = new Set(boundaryCodes)
  const adminCodes = records.map((record) => record.adminCode)
  const recordSourceTypes = [
    ...new Set(records.map((record) => record.sourceType).filter(isDefinedString)),
  ]
  const adminCodeSet = new Set(adminCodes)
  const referenceCodeSet = new Set(referenceCodes)

  const missingFeatureCodes = adminCodes.filter((code) => !boundaryCodeSet.has(code))
  const missingRecordCodes = [...boundaryCodeSet].filter(
    (code) => !adminCodeSet.has(code),
  )
  const missingReferenceCodes = adminCodes.filter((code) => !referenceCodeSet.has(code))
  const status =
    boundaryCodes.length === 0
      ? 'skipped'
      : missingFeatureCodes.length === 0 &&
          missingRecordCodes.length === 0 &&
          missingReferenceCodes.length === 0
        ? 'valid'
        : 'mismatch'

  return {
    datasetName,
    boundaryName,
    contextLabel,
    referenceName,
    referenceCodes,
    missingReferenceCodes,
    status,
    boundaryCodes,
    adminCodes,
    adminLevelMismatchCodes: [],
    parentCodeMismatchCodes: [],
    recordSourceTypes,
    mixedSourceWarning:
      recordSourceTypes.length > 1
        ? `Mixed record source types detected: ${recordSourceTypes.join(', ')}`
        : undefined,
    matchedCount: records.length - missingFeatureCodes.length,
    boundaryCount: boundaryCodes.length,
    recordCount: records.length,
    missingFeatureCodes,
    missingRecordCodes,
    isValid: status === 'valid',
  }
}

export const validateBoundaryAdminJoin = ({
  boundaryName,
  contextLabel,
  boundaries,
  adminRecords,
}: BoundaryAdminJoinInput): JoinValidationResult => {
  const boundaryCodes = boundaries?.features.map((feature) => feature.properties.adminCode) ?? []
  const adminCodes = adminRecords.map((record) => record.code)
  const boundaryCodeSet = new Set(boundaryCodes)
  const adminCodeSet = new Set(adminCodes)
  const boundarySourceType = boundaries?.metadata?.sourceType
  const adminParentLookup = new Map(
    adminRecords.map((record) => [record.code, record.parentCode]),
  )

  const missingFeatureCodes = adminCodes.filter((code) => !boundaryCodeSet.has(code))
  const missingRecordCodes = [...boundaryCodeSet].filter(
    (code) => !adminCodeSet.has(code),
  )
  const adminLevelMismatchCodes = (boundaries?.features ?? [])
    .filter(
      (feature) =>
        getAdminLevelFromCode(feature.properties.adminCode as AdminCode) !==
        feature.properties.adminLevel,
    )
    .map((feature) => feature.properties.adminCode)
  const parentCodeMismatchCodes = (boundaries?.features ?? [])
    .filter((feature) => {
      const expectedParentCode = adminParentLookup.get(feature.properties.adminCode)

      if (!expectedParentCode) {
        return Boolean(
          feature.properties.adminLevel !== 'province' && feature.properties.parentCode,
        )
      }

      return feature.properties.parentCode !== expectedParentCode
    })
    .map((feature) => feature.properties.adminCode)
  const status =
    boundaryCodes.length === 0
      ? 'skipped'
      : missingFeatureCodes.length === 0 &&
          missingRecordCodes.length === 0 &&
          adminLevelMismatchCodes.length === 0 &&
          parentCodeMismatchCodes.length === 0
        ? 'valid'
        : 'mismatch'

  return {
    datasetName: 'boundary-admin',
    boundaryName,
    contextLabel,
    status,
    boundaryCodes,
    adminCodes,
    adminLevelMismatchCodes,
    parentCodeMismatchCodes,
    boundarySourceType,
    matchedCount: boundaryCodes.length - missingRecordCodes.length,
    boundaryCount: boundaryCodes.length,
    recordCount: adminCodes.length,
    missingFeatureCodes,
    missingRecordCodes,
    isValid: status === 'valid',
  }
}

export const validateThematicMapJoin = ({
  metricKey,
  boundaryName,
  boundaries,
  records,
  missingPopulationCodes,
  missingElectionCodes,
  calculationUnavailableCodes,
}: ThematicMapJoinInput): JoinValidationResult => {
  const baseResult = validateAdminJoin({
    datasetName: 'thematic-map',
    boundaryName,
    contextLabel: metricKey,
    boundaries,
    records,
  })

  const status =
    baseResult.status === 'valid' &&
    missingPopulationCodes.length === 0 &&
    missingElectionCodes.length === 0 &&
    calculationUnavailableCodes.length === 0
      ? 'valid'
      : baseResult.status === 'skipped'
        ? 'skipped'
        : 'mismatch'

  return {
    ...baseResult,
    status,
    missingPopulationCodes,
    missingElectionCodes,
    calculationUnavailableCodes,
  }
}

export const validateTimeSeriesJoin = ({
  datasetName,
  metricKey,
  records,
  expectedAdminCode,
  expectedAdminLevel,
}: TimeSeriesJoinInput): JoinValidationResult => {
  const recordSourceTypes = [
    ...new Set(records.map((record) => record.sourceType).filter(isDefinedString)),
  ]
  const invalidAdminCodes = records
    .filter((record) => record.adminCode !== expectedAdminCode)
    .map((record) => record.adminCode)
  const adminLevelMismatchCodes = records
    .filter((record) => record.adminLevel && record.adminLevel !== expectedAdminLevel)
    .map((record) => record.adminCode)
  const years = [...new Set(records.map((record) => record.year))].sort((left, right) => left - right)
  const missingYears = years.length > 1
    ? years.filter((year, index) => index > 0 && year - years[index - 1] > 1)
    : []
  const status =
    invalidAdminCodes.length === 0 &&
    adminLevelMismatchCodes.length === 0 &&
    missingYears.length === 0
      ? 'valid'
      : 'mismatch'

  return {
    datasetName,
    boundaryName: `${expectedAdminCode}-${metricKey}`,
    contextLabel: metricKey,
    status,
    boundaryCodes: [expectedAdminCode],
    adminCodes: records.map((record) => record.adminCode),
    adminLevelMismatchCodes,
    parentCodeMismatchCodes: [],
    recordSourceTypes,
    matchedCount: records.length - invalidAdminCodes.length,
    boundaryCount: 1,
    recordCount: records.length,
    missingFeatureCodes: invalidAdminCodes,
    missingRecordCodes: [],
    isValid: status === 'valid',
    calculationUnavailableCodes: missingYears.map(String),
    mixedSourceWarning:
      recordSourceTypes.length > 1
        ? `Mixed record source types detected: ${recordSourceTypes.join(', ')}`
        : undefined,
  }
}

export const logAdminJoinValidation = (result: JoinValidationResult) => {
  if (!APP_CONFIG.debugDataSources) {
    return
  }

  const tag = result.contextLabel
    ? `[join:${result.datasetName}:${result.contextLabel}]`
    : `[join:${result.datasetName}]`

  if (result.status === 'skipped') {
    console.info(
      `${tag} skipped for ${result.boundaryName} because no boundary layer is loaded yet`,
    )
    return
  }

  if (result.status === 'valid') {
    console.info(
      `${tag} ${result.boundaryName} join ok (${result.matchedCount}/${result.recordCount})`,
    )
    if (result.boundarySourceType || (result.recordSourceTypes?.length ?? 0) > 0) {
      console.info(
        `${tag} sources boundary=${result.boundarySourceType ?? 'n/a'} records=${
          result.recordSourceTypes?.join(', ') ?? 'n/a'
        }`,
      )
    }
    if (result.mixedSourceWarning) {
      console.warn(`${tag} mixed-source state detected. ${result.mixedSourceWarning}`)
    }
    return
  }

  console.groupCollapsed(
    `${tag} join mismatch for ${result.boundaryName} (${result.matchedCount}/${result.recordCount})`,
  )
  console.info('boundary codes:', toSample(result.boundaryCodes))
  console.info('admin codes:', toSample(result.adminCodes))
  console.info('missing feature codes:', toSample(result.missingFeatureCodes))
  console.info('missing record codes:', toSample(result.missingRecordCodes))
  if (result.referenceName) {
    console.info(`${result.referenceName} codes:`, toSample(result.referenceCodes))
    console.info(
      `missing ${result.referenceName} codes:`,
      toSample(result.missingReferenceCodes),
    )
  }
  console.info(
    'admin level mismatch codes:',
    toSample(result.adminLevelMismatchCodes),
  )
  console.info(
    'parent code mismatch codes:',
    toSample(result.parentCodeMismatchCodes ?? []),
  )
  console.info('boundary source type:', result.boundarySourceType ?? null)
  console.info('record source types:', result.recordSourceTypes ?? [])
  console.info(
    'missing population codes:',
    toSample(result.missingPopulationCodes ?? []),
  )
  console.info(
    'missing election codes:',
    toSample(result.missingElectionCodes ?? []),
  )
  console.info(
    'calculation unavailable codes:',
    toSample(result.calculationUnavailableCodes ?? []),
  )
  if (result.mixedSourceWarning) {
    console.warn('mixed source warning:', result.mixedSourceWarning)
  }
  console.groupEnd()
}
