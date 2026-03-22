import type { SearchResultItem } from '../types/search'

export const uniqueSearchResults = (items: SearchResultItem[]) => {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.adminCode)) return false
    seen.add(item.adminCode)
    return true
  })
}
