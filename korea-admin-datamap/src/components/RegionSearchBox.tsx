import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchResultList } from '@/components/SearchResultList'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  searchCity,
  searchProvince,
  searchRegions,
  searchTown,
} from '@/services/searchService'
import type { AdminLevel } from '@/types/admin'
import type { RegionSearchResult } from '@/types/search'
import { getRegionNavigationPath } from '@/utils/regionNavigation'

interface RegionSearchBoxProps {
  title?: string
  placeholder?: string
  levels?: AdminLevel[]
  scopeProvinceCode?: string
  scopeCityCode?: string
  excludedAdminCodes?: string[]
  autoNavigate?: boolean
  onSelect?: (result: RegionSearchResult) => void
}

const matchesScope = (
  result: RegionSearchResult,
  scopeProvinceCode?: string,
  scopeCityCode?: string,
) => {
  if (scopeProvinceCode && result.provinceCode !== scopeProvinceCode) {
    return false
  }

  if (scopeCityCode && result.cityCode !== scopeCityCode && result.adminCode !== scopeCityCode) {
    return false
  }

  return true
}

export function RegionSearchBox({
  title = '지역 검색',
  placeholder = '시도, 시군구, 행정동 이름 검색',
  levels,
  scopeProvinceCode,
  scopeCityCode,
  excludedAdminCodes,
  autoNavigate = true,
  onSelect,
}: RegionSearchBoxProps) {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const deferredKeyword = useDeferredValue(keyword.trim())
  const normalizedLevels = levels?.join(',') ?? 'all'

  const searchState = useAsyncData(async () => {
    if (deferredKeyword.length < 1) {
      return []
    }

    if (levels?.length === 1) {
      if (levels[0] === 'province') {
        return searchProvince(deferredKeyword)
      }

      if (levels[0] === 'city') {
        return searchCity(deferredKeyword)
      }

      return searchTown(deferredKeyword)
    }

    return searchRegions(deferredKeyword)
  }, [deferredKeyword, normalizedLevels])

  const filteredResults = useMemo(
    () =>
      (searchState.data ?? []).filter((result) => {
        if (levels && !levels.includes(result.adminLevel)) {
          return false
        }

        if (excludedAdminCodes?.includes(result.adminCode)) {
          return false
        }

        return matchesScope(result, scopeProvinceCode, scopeCityCode)
      }),
    [
      excludedAdminCodes,
      levels,
      scopeCityCode,
      scopeProvinceCode,
      searchState.data,
    ],
  )

  const handleSelect = (result: RegionSearchResult) => {
    onSelect?.(result)
    setKeyword(autoNavigate ? result.name : '')

    if (autoNavigate) {
      navigate(getRegionNavigationPath(result))
    }
  }

  return (
    <div className="search-box">
      <label className="search-input-label">
        <span className="eyebrow">{title}</span>
        <input
          aria-label={title}
          className="search-input"
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={placeholder}
          type="search"
          value={keyword}
        />
      </label>
      {deferredKeyword.length > 0 ? (
        searchState.loading && !(searchState.data ?? []).length ? (
          <p className="helper-text">검색 중입니다.</p>
        ) : searchState.error ? (
          <p className="helper-text">{searchState.error}</p>
        ) : filteredResults.length > 0 ? (
          <SearchResultList onSelect={handleSelect} results={filteredResults} />
        ) : (
          <p className="helper-text">일치하는 지역이 없습니다.</p>
        )
      ) : null}
    </div>
  )
}
