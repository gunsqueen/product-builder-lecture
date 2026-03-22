import { useEffect, useState } from 'react'
import L from 'leaflet'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BoundaryMap } from '../components/map/BoundaryMap'
import { loadTownBoundaries } from '../services/boundaryService'
import { getBoundaryStatus } from '../services/sourceStatusService'
import type { BoundaryCollection } from '../types/admin'
import { getCityByCode, getProvinceByCode } from '../utils/adminLookup'

export const CityPage = () => {
  const navigate = useNavigate()
  const { provinceCode = '', cityCode = '' } = useParams()
  const [data, setData] = useState<BoundaryCollection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [renderDebug, setRenderDebug] = useState({
    renderedFeatureCount: 0,
    mapBounds: '-',
    fitBoundsApplied: false,
    geoJsonMounted: false,
    firstFeatureBounds: '-',
    geometryTypesSummary: [] as string[],
  })
  const province = getProvinceByCode(provinceCode)
  const city = getCityByCode(cityCode)
  const boundaryStatus = getBoundaryStatus()

  useEffect(() => {
    const run = async () => {
      try {
        const result = await loadTownBoundaries(cityCode)
        if (import.meta.env.DEV) {
          console.log('[city:town-boundaries]', {
            cityCode,
            requestedCityCode: cityCode,
            requestUrl: getBoundaryStatus().requestUrl,
            sourceType: getBoundaryStatus().sourceType,
            featureCount: result.features.length,
            geometryTypes: [...new Set(result.features.map((feature) => feature.geometry.type))],
            firstFeatureSample: result.features.slice(0, 1).map((feature) => ({
              adminCode: feature.properties.adminCode,
              name: feature.properties.name,
              fullName: feature.properties.fullName,
            })),
          })
        }
        setData(result)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '알 수 없는 오류')
      }
    }

    void run()
  }, [cityCode])

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
        <h2>{city?.name ?? cityCode} 읍면동 지도 로드 실패</h2>
        <p>{error}</p>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="map-card">
        <h2>{city?.name ?? cityCode} 읍면동 지도 로딩 중</h2>
        <p>로컬 행정경계 GeoJSON에서 하위 읍면동 경계를 가져오는 중입니다.</p>
      </section>
    )
  }

  if (data.features.length === 0) {
    return (
      <section className="map-card">
        <h2>{city?.name ?? cityCode} 하위 읍면동이 없습니다</h2>
        <p>실제 경계를 찾지 못해 빈 상태를 표시합니다.</p>
      </section>
    )
  }

  const firstFeatureBounds =
    data.features.length > 0 ? L.geoJSON(data.features[0] as never).getBounds() : null
  const formattedFirstBounds = firstFeatureBounds?.isValid()
    ? `${firstFeatureBounds.getSouthWest().lat.toFixed(6)}, ${firstFeatureBounds.getSouthWest().lng.toFixed(6)} / ${firstFeatureBounds.getNorthEast().lat.toFixed(6)}, ${firstFeatureBounds.getNorthEast().lng.toFixed(6)}`
    : '-'

  return (
    <section className="map-card">
      <div className="map-header">
        <div>
          <span className="eyebrow">city detail</span>
          <h2>
            {province.name} {city?.name ?? cityCode}
          </h2>
          <p>{data.features.length} town polygons loaded</p>
        </div>
        <div className="map-meta">
          <Link to={`/province/${provinceCode}`}>시도 상세 돌아가기</Link>
          <span>sourceType: {boundaryStatus.sourceType}</span>
          <span>request url: {boundaryStatus.requestUrl ?? '-'}</span>
          <span>fallback: {boundaryStatus.fallbackReason ?? '-'}</span>
        </div>
      </div>
      {import.meta.env.DEV ? (
        <div className="debug-panel">
          <strong>town debug</strong>
          <span>current route: /province/{provinceCode}/city/{cityCode}</span>
          <span>cityCode: {cityCode}</span>
          <span>requested cityCode: {cityCode}</span>
          <span>town boundary feature count: {data.features.length}</span>
          <span>geometry types: {renderDebug.geometryTypesSummary.join(', ') || '-'}</span>
          <span>sourceType: {boundaryStatus.sourceType}</span>
          <span>fallback reason: {boundaryStatus.fallbackReason ?? '-'}</span>
          <span>rendered feature count: {renderDebug.renderedFeatureCount}</span>
          <span>map bounds: {renderDebug.mapBounds}</span>
          <span>first feature bounds: {formattedFirstBounds}</span>
          <span>geoJsonMounted: {String(renderDebug.geoJsonMounted)}</span>
          <span>fitBoundsApplied: {String(renderDebug.fitBoundsApplied)}</span>
        </div>
      ) : null}
      <BoundaryMap
        data={data}
        variant="town"
        onDebugInfo={setRenderDebug}
        onFeatureClick={(feature) => {
          console.log('town clicked', feature.properties.adminCode)
          navigate(`/province/${provinceCode}/city/${cityCode}/town/${feature.properties.adminCode}`)
        }}
      />
    </section>
  )
}
