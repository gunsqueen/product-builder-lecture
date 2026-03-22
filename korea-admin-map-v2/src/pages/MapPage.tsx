import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BoundaryMap } from '../components/map/BoundaryMap'
import { loadProvinceBoundaries } from '../services/boundaryService'
import type { BoundaryCollection } from '../types/admin'

export const MapPage = () => {
  const navigate = useNavigate()
  const [data, setData] = useState<BoundaryCollection | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const result = await loadProvinceBoundaries()
        setData(result)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '알 수 없는 오류')
      }
    }

    void run()
  }, [])

  if (error) {
    return (
      <section className="map-card">
        <h2>전국 시도 지도 로드 실패</h2>
        <p>{error}</p>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="map-card">
        <h2>전국 시도 지도 로딩 중</h2>
        <p>로컬 행정경계 GeoJSON에서 시도 경계를 준비하는 중입니다.</p>
      </section>
    )
  }

  return (
    <section className="map-card">
      <div className="map-header">
        <div>
          <span className="eyebrow">stage 3</span>
          <h2>대한민국 시도 경계</h2>
          <p>{data.features.length} provinces loaded</p>
        </div>
      </div>
      <BoundaryMap
        data={data}
        variant="province"
        onFeatureClick={(feature) => {
          console.log('province clicked', feature.properties.adminCode)
          navigate(`/province/${feature.properties.adminCode}`)
        }}
      />
    </section>
  )
}
