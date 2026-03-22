import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RegionSearchBox } from '@/components/RegionSearchBox'
import { TimeSeriesChart } from '@/components/TimeSeriesChart'
import { TimeSeriesComparisonChart } from '@/components/TimeSeriesComparisonChart'
import { TimeSeriesSummaryCard } from '@/components/TimeSeriesSummaryCard'
import {
  EmptyPanel,
  LoadingPanel,
} from '@/components/common/StatePanel'
import { SourceMetaGrid } from '@/components/common/SourceMetaGrid'
import { ROUTES } from '@/config/routes'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getRegionSearchResultByCode } from '@/services/searchService'
import {
  compareTimeSeries,
  getElectionTimeSeries,
  getPopulationTimeSeries,
} from '@/services/timeSeriesService'
import type { RegionSearchResult } from '@/types/search'
import type { TimeSeriesMetricKey } from '@/types/timeSeries'
import { logAdminJoinValidation, validateTimeSeriesJoin } from '@/utils/joinValidator'
import {
  calculateAgingRateChange,
  calculateFirstSecondGapChange,
  calculatePopulationGrowthRate,
  calculateTurnoutChange,
  calculateYouthRateChange,
} from '@/utils/timeSeriesMetrics'

const TIME_SERIES_METRICS: Record<
  TimeSeriesMetricKey,
  { label: string; domain: 'population' | 'election' }
> = {
  totalPopulation: { label: '총인구', domain: 'population' },
  agingRate: { label: '고령화율', domain: 'population' },
  youth2039Rate: { label: '20-39세 비율', domain: 'population' },
  turnoutRate: { label: '투표율', domain: 'election' },
  firstSecondGap: { label: '1·2위 격차', domain: 'election' },
}

const formatChangeValue = (metricKey: TimeSeriesMetricKey, value: number) =>
  metricKey === 'totalPopulation'
    ? `${value.toFixed(1)}%`
    : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%p`

const getChangeForMetric = (metricKey: TimeSeriesMetricKey, values: ReturnType<typeof getPopulationTimeSeries> extends Promise<infer T> ? T : never) => {
  switch (metricKey) {
    case 'totalPopulation':
      return calculatePopulationGrowthRate(values)
    case 'agingRate':
      return calculateAgingRateChange(values)
    case 'youth2039Rate':
      return calculateYouthRateChange(values)
    case 'turnoutRate':
      return calculateTurnoutChange(values)
    case 'firstSecondGap':
      return calculateFirstSecondGapChange(values)
  }
}

export function TrendsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedRegionA, setSelectedRegionA] = useState<RegionSearchResult | null>(null)
  const [selectedRegionB, setSelectedRegionB] = useState<RegionSearchResult | null>(null)
  const rawMetricKey = searchParams.get('metric') ?? 'totalPopulation'
  const metricKey = (rawMetricKey in TIME_SERIES_METRICS
    ? rawMetricKey
    : 'totalPopulation') as TimeSeriesMetricKey

  const adminCodeA = searchParams.get('regionA') ?? undefined
  const adminCodeB = searchParams.get('regionB') ?? undefined

  const regionAState = useAsyncData(
    () => (adminCodeA ? getRegionSearchResultByCode(adminCodeA) : Promise.resolve(null)),
    [adminCodeA],
  )
  const regionBState = useAsyncData(
    () => (adminCodeB ? getRegionSearchResultByCode(adminCodeB) : Promise.resolve(null)),
    [adminCodeB],
  )

  const regionA = selectedRegionA ?? regionAState.data ?? null
  const regionB = selectedRegionB ?? regionBState.data ?? null

  const seriesAState = useAsyncData(async () => {
    if (!adminCodeA) {
      return []
    }

    return TIME_SERIES_METRICS[metricKey].domain === 'population'
      ? getPopulationTimeSeries(adminCodeA, metricKey as 'totalPopulation' | 'agingRate' | 'youth2039Rate')
      : getElectionTimeSeries(adminCodeA, metricKey as 'turnoutRate' | 'firstSecondGap')
  }, [adminCodeA, metricKey])

  const comparisonState = useAsyncData(async () => {
    if (!regionA || !regionB) {
      return null
    }

    return compareTimeSeries(regionA, regionB, metricKey)
  }, [metricKey, regionA, regionB])

  const seriesJoinResult = useMemo(
    () =>
      regionA
        ? validateTimeSeriesJoin({
            datasetName: 'time-series',
            metricKey,
            records: seriesAState.data ?? [],
            expectedAdminCode: regionA.adminCode,
            expectedAdminLevel: regionA.adminLevel,
          })
        : null,
    [metricKey, regionA, seriesAState.data],
  )

  useEffect(() => {
    if (seriesJoinResult) {
      logAdminJoinValidation(seriesJoinResult)
    }
  }, [seriesJoinResult])

  const comparisonWarning =
    regionA && regionB && regionA.adminLevel !== regionB.adminLevel
      ? 'adminLevel이 다른 지역끼리 비교 중입니다. 해석에 주의하세요.'
      : null

  const handleMetricChange = (nextMetricKey: TimeSeriesMetricKey) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('metric', nextMetricKey)
    setSearchParams(nextParams)
  }

  const handleSelectRegion =
    (key: 'regionA' | 'regionB') => (result: RegionSearchResult) => {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set(key, result.adminCode)
      setSearchParams(nextParams)
      if (key === 'regionA') {
        setSelectedRegionA(result)
      } else {
        setSelectedRegionB(result)
      }
    }

  const metricLabel = TIME_SERIES_METRICS[metricKey].label
  const seriesAChangeValue = formatChangeValue(metricKey, getChangeForMetric(metricKey, seriesAState.data ?? []))

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">시계열 비교</span>
          <h1>연도별 인구 / 선거 추세</h1>
        </div>
        <p>
          snapshot 기반 시계열 데이터를 adminCode 기준으로 비교합니다. real API가
          확장되더라도 sourceType과 sourceDate 표시는 그대로 유지됩니다.
        </p>
      </div>

      <div className="card-grid">
        <article className="panel">
          <label className="select-field">
            <span className="eyebrow">지표 선택</span>
            <select
              aria-label="시계열 지표 선택"
              className="select-input"
              value={metricKey}
              onChange={(event) => handleMetricChange(event.target.value as TimeSeriesMetricKey)}
            >
              {Object.entries(TIME_SERIES_METRICS).map(([key, metric]) => (
                <option key={key} value={key}>
                  {metric.label}
                </option>
              ))}
            </select>
          </label>
          <p className="helper-text">
            현재 지표: {metricLabel} · {TIME_SERIES_METRICS[metricKey].domain}
          </p>
        </article>

        <article className="panel">
          <span className="eyebrow">빠른 이동</span>
          <h2>상세 페이지 연결</h2>
          <div className="button-row">
            <Link className="button button-secondary" to={ROUTES.compare}>
              비교 페이지
            </Link>
            <Link className="button button-secondary" to={ROUTES.sources}>
              Sources / 디버그
            </Link>
          </div>
          {comparisonWarning ? <p className="helper-text">{comparisonWarning}</p> : null}
        </article>
      </div>

      <div className="card-grid">
        <article className="panel">
          <RegionSearchBox
          excludedAdminCodes={regionB ? [regionB.adminCode] : undefined}
          onSelect={handleSelectRegion('regionA')}
            title="지역 A 선택"
            autoNavigate={false}
          />
        </article>
        <article className="panel">
          <RegionSearchBox
          excludedAdminCodes={regionA ? [regionA.adminCode] : undefined}
          onSelect={handleSelectRegion('regionB')}
            title="지역 B 선택"
            autoNavigate={false}
          />
        </article>
      </div>

      <SourceMetaGrid
        title="시계열 기준일과 출처"
        items={[
          {
            label: '단일 추세',
            sourceType: seriesAState.data?.[seriesAState.data.length - 1]?.sourceType,
            sourceDate: seriesAState.data?.[seriesAState.data.length - 1]?.sourceDate,
            description: regionA ? `${regionA.name} ${metricLabel}` : '지역 A 선택 필요',
          },
          {
            label: '비교 추세',
            sourceType: comparisonState.data?.sourceType,
            sourceDate: comparisonState.data?.sourceDate,
            description: comparisonState.data
              ? `${comparisonState.data.regionA.name} vs ${comparisonState.data.regionB.name}`
              : '지역 B 선택 시 비교 가능',
          },
        ]}
      />

      {seriesJoinResult?.calculationUnavailableCodes?.length ? (
        <EmptyPanel
          className="state-panel-compact"
          message={`연속되지 않은 연도가 있습니다: ${seriesJoinResult.calculationUnavailableCodes.join(', ')}`}
        />
      ) : null}

      {!regionA ? (
        <EmptyPanel message="지역 A를 선택하면 단일 지역 추세를 볼 수 있습니다." />
      ) : seriesAState.loading ? (
        <LoadingPanel message="시계열 데이터를 불러오는 중입니다." />
      ) : (seriesAState.data ?? []).length === 0 ? (
        <EmptyPanel message="이 지역의 시계열 snapshot 데이터가 아직 없습니다." />
      ) : (
        <div className="card-grid">
          <TimeSeriesSummaryCard
            title="단일 지역 추세"
            label={`${regionA.name} ${metricLabel}`}
            points={seriesAState.data ?? []}
            changeValue={seriesAChangeValue}
          />
          <TimeSeriesChart
            eyebrow="Single Region"
            points={seriesAState.data ?? []}
            title={`${regionA.name} ${metricLabel} 추세`}
          />
        </div>
      )}

      {comparisonState.loading ? (
        <LoadingPanel message="두 지역 비교 시계열을 준비하는 중입니다." />
      ) : comparisonState.data ? (
        <TimeSeriesComparisonChart comparison={comparisonState.data} />
      ) : (
        <EmptyPanel message="지역 B를 선택하면 두 지역 추세 비교를 볼 수 있습니다." />
      )}
    </section>
  )
}
