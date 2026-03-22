export interface AsyncDataState<T> {
  data: T | null
  loading: boolean
  error: string | null
}
