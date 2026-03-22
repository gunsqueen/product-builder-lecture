export interface SourceStatus {
  sourceType: 'real' | 'snapshot' | 'mock'
  requestUrl?: string
  fallbackReason?: string
  scope?: 'province' | 'city' | 'town'
}

let boundaryStatus: SourceStatus = {
  sourceType: 'real',
}

export const setBoundaryStatus = (status: SourceStatus) => {
  boundaryStatus = status
}

export const getBoundaryStatus = () => boundaryStatus
