import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BoundaryMap } from '../components/map/BoundaryMap'
import { loadCityBoundaries } from '../services/boundaryService'
import { getBoundaryStatus } from '../services/sourceStatusService'
import type { BoundaryCollection } from '../types/admin'
import { getProvinceByCode } from '../utils/adminLookup'

export const ProvincePage = () => {
  const navigate = useNavigate()
  const { provinceCode = '' } = useParams()
  const [data, setData] = useState<BoundaryCollection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const province = getProvinceByCode(provinceCode)
  const boundaryStatus = getBoundaryStatus()

  useEffect(() => {
    const run = async () => {
      try {
        const result = await loadCityBoundaries(provinceCode)
        setData(result)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '알 수 없는 오류')
      }
    }

    void run()
  }, [provinceCode])

  if (!province) {
    return (
      <section className="map-card">
        <h2>시도를 찾을 수 없습니다</h2>
        <p>provinceCode {provinceCode}에 해당하는 시도를 찾지 못했습니다.</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="map-card">
        <h2>{province.name} 시군구 지도 로드 실패</h2>
        <p>{error}</p>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="map-card">
        <h2>{province.name} 시군구 지도 로딩 중</h2>
        <p>로컬 행정경계 GeoJSON에서 하위 시군구 경계를 가져오는 중입니다.</p>
      </section>
    )
  }

  return (
    <section className="map-card">
      <div className="map-header">
        <div>
          <span className="eyebrow">province detail</span>
          <h2>{province.name}</h2>
          <p>{data.features.length} city/district polygons loaded</p>
        </div>
        <div className="map-meta">
          <Link to="/map">전국 지도 돌아가기</Link>
          <span>sourceType: {boundaryStatus.sourceType}</span>
          <span>request url: {boundaryStatus.requestUrl ?? '-'}</span>
          <span>fallback: {boundaryStatus.fallbackReason ?? '-'}</span>
        </div>
      </div>
      <BoundaryMap
        data={data}
        variant="city"
        onFeatureClick={(feature) => {
          console.log('city clicked', feature.properties.adminCode)
          navigate(`/province/${provinceCode}/city/${feature.properties.adminCode}`)
        }}
      />
    </section>
  )
}
