const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '')

export const buildRuntimeUrl = (baseUrl: string, path: string) => {
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
  const base = baseUrl.trim()
  const route = path.trim()

  if (/^https?:\/\//.test(base)) {
    return new URL(route, base)
  }

  const normalizedBase = base ? `/${trimSlashes(base)}` : ''
  const normalizedPath = trimSlashes(route)
  return new URL(`${normalizedBase}/${normalizedPath}`, origin)
}
