import { buildNameAliases, normalizeAdminName } from './adminName'
import type { BoundaryFeature } from '../types/admin'

export const buildTownElectionLookup = (boundaries: BoundaryFeature[]) => {
  const lookup = new Map<string, string>()

  boundaries.forEach((feature) => {
    const aliases = new Set([
      ...buildNameAliases(feature.properties.name),
      ...buildNameAliases(feature.properties.fullName ?? feature.properties.name),
    ])

    aliases.forEach((alias) => {
      lookup.set(normalizeAdminName(alias), feature.properties.adminCode)
    })
  })

  return lookup
}
