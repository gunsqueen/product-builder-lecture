type LooseRecord = Record<string, unknown>

const RECORD_TAG_NAMES = ['item', 'row', 'record']

const isRecord = (value: unknown): value is LooseRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toRecord = (value: unknown): LooseRecord | null => (isRecord(value) ? value : null)

const getNestedValue = (payload: unknown, path: string[]) =>
  path.reduce<unknown>((currentValue, segment) => {
    if (!isRecord(currentValue)) {
      return undefined
    }

    return currentValue[segment]
  }, payload)

const commonArrayPaths = [
  ['response', 'body', 'items', 'item'],
  ['response', 'body', 'items'],
  ['body', 'items', 'item'],
  ['body', 'items'],
  ['result', 'items'],
  ['result', 'item'],
  ['items', 'item'],
  ['items'],
  ['data'],
  ['results'],
  ['row'],
]

const xmlNodeToRecord = (node: Element): LooseRecord =>
  Object.fromEntries(
    [...node.children].map((child) => [child.tagName, child.textContent?.trim() ?? '']),
  )

const parseXmlRecords = (payload: string): LooseRecord[] => {
  if (typeof DOMParser === 'undefined') {
    return []
  }

  const parser = new DOMParser()
  const documentNode = parser.parseFromString(payload, 'application/xml')
  const parserError = documentNode.querySelector('parsererror')

  if (parserError) {
    return []
  }

  for (const tagName of RECORD_TAG_NAMES) {
    const nodes = [...documentNode.querySelectorAll(tagName)]

    if (nodes.length > 0) {
      return nodes.map((node) => xmlNodeToRecord(node))
    }
  }

  return []
}

export const parseApiResponsePayload = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export const extractApiRecords = (payload: unknown): LooseRecord[] => {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord)
  }

  if (typeof payload === 'string') {
    return parseXmlRecords(payload)
  }

  for (const path of commonArrayPaths) {
    const candidate = getNestedValue(payload, path)

    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord)
    }
  }

  const directRecord = toRecord(payload)
  if (directRecord) {
    return [directRecord]
  }

  return []
}

export const getApiRecordValue = (
  record: LooseRecord,
  candidateKeys: string[],
): string | number | null | undefined => {
  for (const key of candidateKeys) {
    const value = record[key]
    if (value !== null && value !== undefined && value !== '') {
      return value as string | number
    }
  }

  return undefined
}

export const getApiErrorMessage = (payload: unknown) => {
  if (!isRecord(payload)) {
    return null
  }

  const errMsg = getApiRecordValue(payload, [
    'errMsg',
    'errmsg',
    'message',
    'msg',
    'resultMsg',
  ])
  const errCd = getApiRecordValue(payload, [
    'errCd',
    'resultCode',
    'returnReasonCode',
    'code',
  ])

  if (!errMsg && !errCd) {
    return null
  }

  const errorCode = String(errCd ?? '').trim()
  const isErrorCode =
    errorCode.length > 0 &&
    errorCode !== '0' &&
    errorCode !== '00' &&
    errorCode.toUpperCase() !== 'INFO-000'

  if (!isErrorCode && !errMsg) {
    return null
  }

  return [errCd, errMsg].filter(Boolean).join(' ')
}
