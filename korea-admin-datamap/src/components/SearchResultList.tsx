import type { RegionSearchResult } from '@/types/search'

interface SearchResultListProps {
  results: RegionSearchResult[]
  onSelect: (result: RegionSearchResult) => void
}

const levelLabel = {
  province: '시도',
  city: '시군구',
  town: '행정동',
} as const

export function SearchResultList({ results, onSelect }: SearchResultListProps) {
  if (results.length === 0) {
    return null
  }

  return (
    <ul className="search-result-list">
      {results.map((result) => (
        <li key={result.adminCode}>
          <button
            aria-label={`${result.name} ${levelLabel[result.adminLevel]} 선택`}
            className="search-result-button"
            onClick={() => onSelect(result)}
            type="button"
          >
            <span className={`search-level-badge search-level-${result.adminLevel}`}>
              {levelLabel[result.adminLevel]}
            </span>
            <div className="search-result-copy">
              <strong>{result.name}</strong>
              <p>
                {result.parentName ? `${result.parentName} · ` : ''}
                {result.adminCode}
              </p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
