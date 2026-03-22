import { buildNameAliases, normalizeAdminName } from './adminName'

export const normalizeSearchKeyword = (value: string) => normalizeAdminName(value)

export const buildSearchKeywords = (name: string, parentName?: string) => {
  const aliases = new Set<string>(buildNameAliases(name).map(normalizeAdminName))
  if (parentName) {
    aliases.add(normalizeAdminName(`${parentName} ${name}`))
  }
  return [...aliases]
}
