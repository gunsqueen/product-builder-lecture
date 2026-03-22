import { useMemo, useState } from 'react'
import { searchRegions, getRegionLabel } from '../../services/searchService'
import type { SearchRegionResult } from '../../types/search'

type Props = {
  placeholder?: string
  allowedLevels?: Array<SearchRegionResult['adminLevel']>
  onSelect: (region: SearchRegionResult) => void
  initialValue?: string
}

export const RegionSearchBox = ({ placeholder, allowedLevels, onSelect, initialValue = '' }: Props) => {
  const [query, setQuery] = useState(initialValue)
  const [activeIndex, setActiveIndex] = useState(0)
  const results = useMemo(() => searchRegions(query, allowedLevels), [allowedLevels, query])

  return (
    <div className="search-box">
      <input
        aria-label={placeholder ?? '지역 검색'}
        className="search-input"
        placeholder={placeholder ?? '지역명을 입력하세요'}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(0)
        }}
        onKeyDown={(event) => {
          if (!results.length) return
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActiveIndex((value) => Math.min(value + 1, results.length - 1))
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex((value) => Math.max(value - 1, 0))
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            const selected = results[activeIndex]
            if (selected) {
              setQuery(selected.name)
              onSelect(selected)
            }
          }
        }}
      />
      {query.trim() ? (
        <div className="search-results">
          {results.length > 0 ? (
            results.map((result, index) => (
              <button
                key={result.adminCode}
                className={`search-result ${index === activeIndex ? 'active' : ''}`}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  setQuery(result.name)
                  onSelect(result)
                }}
              >
                <strong>{result.name}</strong>
                <span>{getRegionLabel(result)}</span>
              </button>
            ))
          ) : (
            <div className="search-empty">검색 결과가 없습니다.</div>
          )}
        </div>
      ) : null}
    </div>
  )
}
