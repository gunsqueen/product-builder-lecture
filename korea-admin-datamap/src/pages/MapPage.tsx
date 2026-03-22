import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ErrorPanel,
  LoadingPanel,
} from '@/components/common/StatePanel'
import { MapLegend } from '@/components/MapLegend'
import { ThematicMapControl } from '@/components/ThematicMapControl'
import { AdminMap } from '@/components/map/AdminMap'
import { RegionSearchBox } from '@/components/RegionSearchBox'
import { ProvinceSidebar } from '@/components/province/ProvinceSidebar'
import { THEMATIC_METRICS } from '@/config/thematicMetrics'
import { ROUTES } from '@/config/routes'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useJoinValidation, useJoinValidationLogger } from '@/hooks/useJoinValidation'
import { listProvinces } from '@/services/adminDataService'
import { loadProvinceBoundaries } from '@/services/boundaryDataService'
import { getPopulationStats } from '@/services/populationDataService'
import { getThematicMapData } from '@/services/thematicMapService'
import { logAdminJoinValidation, validateThematicMapJoin } from '@/utils/joinValidator'
import type { ThematicMetricKey } from '@/types/thematicMap'

export function MapPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const provincesState = useAsyncData(() => listProvinces(), [])
  const boundariesState = useAsyncData(() => loadProvinceBoundaries(), [])
  const populationState = useAsyncData(() => getPopulationStats('province'), [])
  const rawMetricKey = searchParams.get('metric')
  const metricKey = (
    rawMetricKey && rawMetricKey in THEMATIC_METRICS
      ? rawMetricKey
      : 'totalPopulation'
  ) as ThematicMetricKey
  const thematicState = useAsyncData(
    () => getThematicMapData(metricKey, 'province'),
    [metricKey],
  )
  const selectedProvinceCode = searchParams.get('selected') ?? undefined

  const joinResult = useJoinValidation({
    datasetName: 'population',
    boundaryName: 'province',
    boundaries: boundariesState.data,
    records: populationState.data ?? [],
  })

  useJoinValidationLogger(joinResult)

  const thematicJoinResult = useMemo(
    () =>
      validateThematicMapJoin({
        metricKey,
        boundaryName: 'province-thematic',
        boundaries: boundariesState.data,
        records: thematicState.data?.items ?? [],
        missingPopulationCodes: thematicState.data?.missingPopulationCodes ?? [],
        missingElectionCodes: thematicState.data?.missingElectionCodes ?? [],
        calculationUnavailableCodes:
          thematicState.data?.calculationUnavailableCodes ?? [],
      }),
    [boundariesState.data, metricKey, thematicState.data],
  )

  useEffect(() => {
    logAdminJoinValidation(thematicJoinResult)
  }, [thematicJoinResult])
  const thematicMetricLookup = Object.fromEntries(
    (thematicState.data?.items ?? [])
      .filter((item) => item.value !== null)
      .map((item) => [item.adminCode, item.value ?? undefined]),
  )
  const thematicColorLookup = Object.fromEntries(
    (thematicState.data?.items ?? []).map((item) => [item.adminCode, item.colorClass]),
  )
  const thematicTooltipLookup = Object.fromEntries(
    (thematicState.data?.items ?? []).map((item) => [
      item.adminCode,
      `<strong>${provincesState.data?.find((province) => province.code === item.adminCode)?.name ?? item.adminCode}</strong><br/>${item.metricLabel}: ${item.formattedValue}`,
    ]),
  )
  const mapError =
    boundariesState.error ?? populationState.error ?? thematicState.error

  const updateSearchParam = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set(key, value)
    setSearchParams(nextParams)
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">전국 지도</span>
          <h1>전국 시도 데이터맵</h1>
        </div>
        <p>
          행정 master는 실제 전체 코드 기준으로 확장되어 있습니다. 경계는 real 모드에서
          SGIS를 우선 시도하고, 실패 시 전체 master 기반 snapshot 경계로 fallback 됩니다.
        </p>
      </div>

      <div className="card-grid">
        <article className="panel">
          <div className="panel-head">
            <span className="eyebrow">지도 검색</span>
            <h2>시도 빠르게 찾기</h2>
          </div>
          <RegionSearchBox
            autoNavigate={false}
            levels={['province']}
            onSelect={(result) => updateSearchParam('selected', result.adminCode)}
            title="시도 검색"
          />
        </article>

        <ThematicMapControl
          metricKey={metricKey}
          onMetricChange={(nextMetricKey) => updateSearchParam('metric', nextMetricKey)}
        />
      </div>

      <div className="map-page-grid">
        {provincesState.loading && !provincesState.data ? (
          <LoadingPanel message="시도 목록을 불러오는 중입니다." />
        ) : provincesState.error ? (
          <ErrorPanel message={provincesState.error} />
        ) : (
          <ProvinceSidebar
            populationStats={populationState.data ?? []}
            provinces={provincesState.data ?? []}
          />
        )}

        <div className="map-column">
          <div className="panel panel-stack">
            <div className="panel-head">
              <span className="eyebrow">Leaflet</span>
              <h2>시도 경계 레이어</h2>
            </div>
            {mapError ? (
              <ErrorPanel message={mapError} />
            ) : boundariesState.loading && !boundariesState.data ? (
              <LoadingPanel message="전국 시도 경계를 불러오는 중입니다." />
            ) : (
              <AdminMap
                data={boundariesState.data}
                fillColorLookup={thematicColorLookup}
                metricLookup={thematicMetricLookup}
                noDataFillColor={thematicState.data?.noDataColor}
                selectedCode={selectedProvinceCode}
                tooltipLookup={thematicTooltipLookup}
                onFeatureClick={(provinceCode) => navigate(ROUTES.province(provinceCode))}
              />
            )}
          </div>
          <MapLegend result={thematicState.data} />
          <div className="panel validation-panel">
            <strong>Join Validation</strong>
            <p>
              matched {joinResult.matchedCount} / records {joinResult.recordCount} / boundaries{' '}
              {joinResult.boundaryCount}
            </p>
            <p>
              population status: {joinResult.status} · thematic status:{' '}
              {thematicJoinResult.status}
            </p>
            <p>
              현재 지표: {thematicState.data?.metricLabel ?? metricKey} · 출처{' '}
              {thematicState.data?.sourceType ?? 'snapshot'} · 기준일{' '}
              {thematicState.data?.sourceDate ?? '1970-01-01'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
