export interface ApiRequestError extends Error {
  statusCode?: number
  requestUrl?: string
  requestedAt?: string
  requestSent?: boolean
  responseReceived?: boolean
  parseSuccess?: boolean
  responsePreview?: string
}

export const createApiRequestError = (
  message: string,
  metadata?: {
    statusCode?: number
    requestUrl?: string
    requestedAt?: string
    requestSent?: boolean
    responseReceived?: boolean
    parseSuccess?: boolean
    responsePreview?: string
  },
): ApiRequestError =>
  Object.assign(new Error(message), metadata)
