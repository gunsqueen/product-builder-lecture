import { useNavigate } from 'react-router-dom'
import { RegionSearchBox } from '../components/search/RegionSearchBox'

export const SearchPage = () => {
  const navigate = useNavigate()

  return (
    <section className="map-card">
      <div className="map-header">
        <div>
          <span className="eyebrow">search</span>
          <h2>지역 검색</h2>
          <p>시도, 시군구, 읍면동을 이름으로 찾아 바로 이동합니다.</p>
        </div>
      </div>
      <RegionSearchBox
        placeholder="예: 화곡3동, 강서구, 서울"
        onSelect={(region) => navigate(region.route)}
      />
    </section>
  )
}
