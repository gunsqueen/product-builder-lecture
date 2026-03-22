import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchRegions } from '../../services/searchService'
import { ROUTES } from '../../config/routes'

export const SearchBox = () => {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const results = useMemo(() => searchRegions(keyword), [keyword])

  return (
    <div className="search-box">
      <input
        aria-label="지역 검색"
        className="search-input"
        placeholder="지역명 검색"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
      />
      {keyword && results.length > 0 ? (
        <div className="search-results">
          {results.map((item) => (
            <button
              key={item.adminCode}
              className="search-result"
              type="button"
              onClick={() => {
                setKeyword('')
                if (item.adminLevel === 'province') {
                  navigate(ROUTES.province(item.provinceCode))
                } else if (item.adminLevel === 'city') {
                  navigate(ROUTES.city(item.provinceCode, item.cityCode!))
                } else {
                  navigate(ROUTES.town(item.provinceCode, item.cityCode!, item.townCode!))
                }
              }}
            >
              <strong>{item.name}</strong>
              <span>{item.parentName}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
