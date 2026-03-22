export const normalizeAdminAreaName = (value?: string | null) =>
  (value ?? '')
    .replaceAll(' ', '')
    .replace(/제(?=\d)/g, '')
    .trim()

export const createAdminAreaNameAliases = (value?: string | null) => {
  const original = (value ?? '').trim()

  if (!original) {
    return []
  }

  const withoutJe = original.replace(/제(?=\d)/g, '')

  return [...new Set([original, withoutJe].filter(Boolean))]
}
