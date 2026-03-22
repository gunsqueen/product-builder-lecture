import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
} from '@/components/common/StatePanel'
import { ElectionResultChart } from '@/components/ElectionResultChart'
import { ElectionSummaryCard } from '@/components/ElectionSummaryCard'
import { PopulationMiniChart } from '@/components/PopulationMiniChart'
import { PopulationSummaryCard } from '@/components/PopulationSummaryCard'
import { RegionSearchBox } from '@/components/RegionSearchBox'
import { SourceMetaGrid } from '@/components/common/SourceMetaGrid'
import { AdminMap } from '@/components/map/AdminMap'
import { StatCard } from '@/components/common/StatCard'
import { ROUTES } from '@/config/routes'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useJoinValidation, useJoinValidationLogger } from '@/hooks/useJoinValidation'
import { getProvinceByCode, listCitiesByProvince } from '@/services/adminDataService'
import { loadCityBoundaries } from '@/services/boundaryDataService'
import {
  getDefaultElectionId,
  getElectionResultByCode,
  getElectionResultsForAdminCode,
} from '@/services/electionDataService'
import {
  getPopulationStats,
  getProvincePopulationByCode,
} from '@/services/populationDataService'
import {
  getElectionTimeSeries,
  getPopulationTimeSeries,
} from '@/services/timeSeriesService'
import { createAdminCodeLookup } from '@/utils/adminCodes'
import { formatPercent, formatPopulation } from '@/utils/formatters'
import {
  logAdminJoinValidation,
  validateDatasetCodeJoin,
} from '@/utils/joinValidator'
import {
  calculateAgingRate,
  calculateYouth2039Rate,
} from '@/utils/metricCalculators'
import {
  calculateAgingRateChange,
  calculatePopulationGrowthRate,
  calculateTurnoutChange,
} from '@/utils/timeSeriesMetrics'

export function ProvincePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { provinceCode = '' } = useParams()
  const selectedCityCode = searchParams.get('selectedCity') ?? undefined
  const provinceState = useAsyncData(() => getProvinceByCode(provinceCode), [provinceCode])
  const citiesState = useAsyncData(() => listCitiesByProvince(provinceCode), [provinceCode])
  const cityBoundariesState = useAsyncData(() => loadCityBoundaries(provinceCode), [provinceCode])
  const populationState = useAsyncData(() => getPopulationStats('city', provinceCode), [provinceCode])
  const provincePopulationState = useAsyncData(
    () => getProvincePopulationByCode(provinceCode),
    [provinceCode],
  )
  const defaultElectionIdState = useAsyncData(() => getDefaultElectionId('province'), [])
  const electionState = useAsyncData(
    () =>
      defaultElectionIdState.data
        ? getElectionResultByCode(provinceCode, defaultElectionIdState.data)
        : Promise.resolve(null),
    [provinceCode, defaultElectionIdState.data],
  )
  const electionResultsState = useAsyncData(
    () =>
      defaultElectionIdState.data
        ? getElectionResultsForAdminCode(provinceCode, defaultElectionIdState.data)
        : Promise.resolve([]),
    [provinceCode, defaultElectionIdState.data],
  )
  const populationTrendState = useAsyncData(
    () => getPopulationTimeSeries(provinceCode, 'totalPopulation'),
    [provinceCode],
  )
  const agingTrendState = useAsyncData(
    () => getPopulationTimeSeries(provinceCode, 'agingRate'),
    [provinceCode],
  )
  const turnoutTrendState = useAsyncData(
    () => getElectionTimeSeries(provinceCode, 'turnoutRate'),
    [provinceCode],
  )

  const displayedCityCodes = useMemo(
    () => new Set(cityBoundariesState.data?.features.map((feature) => feature.properties.adminCode) ?? []),
    [cityBoundariesState.data],
  )

  const displayedCities = useMemo(() => {
    const cities = citiesState.data ?? []

    if (displayedCityCodes.size === 0) {
      return cities
    }

    return cities.filter((city) => displayedCityCodes.has(city.code))
  }, [citiesState.data, displayedCityCodes])

  const displayedPopulationRecords = useMemo(() => {
    const records = populationState.data ?? []

    if (displayedCityCodes.size === 0) {
      return records
    }

    return records.filter((record) => displayedCityCodes.has(record.adminCode))
  }, [displayedCityCodes, populationState.data])

  const joinResult = useJoinValidation({
    datasetName: 'population',
    boundaryName: `${provinceCode}-city`,
    boundaries: cityBoundariesState.data,
    records: displayedPopulationRecords,
  })

  useJoinValidationLogger(joinResult)

  const electionJoinResult = useMemo(
    () =>
      validateDatasetCodeJoin({
        datasetName: 'election',
        boundaryName: `${provinceCode}-province`,
        contextLabel: defaultElectionIdState.data ?? undefined,
        referenceName: 'population',
        boundaryCodes: provinceCode ? [provinceCode] : [],
        records: electionResultsState.data ?? [],
        referenceCodes: provincePopulationState.data
          ? [provincePopulationState.data.adminCode]
          : [],
      }),
    [defaultElectionIdState.data, electionResultsState.data, provinceCode, provincePopulationState.data],
  )

  useEffect(() => {
    logAdminJoinValidation(electionJoinResult)
  }, [electionJoinResult])

  if (provinceState.loading) {
    return <section className="page"><LoadingPanel message="시도 정보를 불러오는 중입니다." /></section>
  }

  if (provinceState.error) {
    return <section className="page"><ErrorPanel message={provinceState.error} /></section>
  }

  if (!provinceState.data) {
    return <section className="page"><EmptyPanel message="해당 시도를 찾을 수 없습니다." /></section>
  }

  const displayedCityCount =
    cityBoundariesState.data?.features.length ?? displayedCities.length ?? provinceState.data.cityCount
  const populationLookup = createAdminCodeLookup(
    displayedPopulationRecords,
    (record) => record.totalPopulation,
  )
  const detailError =
    cityBoundariesState.error ?? populationState.error

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">{provinceState.data.code}</span>
          <h1>{provinceState.data.name}</h1>
        </div>
        <p>{provinceState.data.description}</p>
      </div>

      <div className="hero-metrics">
        <StatCard
          label="수도/중심"
          value={provinceState.data.capital}
          description="행정 중심지 또는 대표 행정도시"
        />
        <StatCard
          label="시군구"
          value={`${displayedCityCount}개`}
          description="지도와 동일한 실제 표시 단위 기준"
        />
        <StatCard
          label="주요 선거"
          value={electionState.data ? electionState.data.partyName : '준비중'}
          description={
            electionState.data
              ? `${formatPercent(electionState.data.voteRate)} 득표`
              : '실데이터 연동 대기'
          }
        />
      </div>

      <SourceMetaGrid
        items={[
          {
            label: '인구',
            sourceType: provincePopulationState.data?.sourceType,
            sourceDate: provincePopulationState.data?.sourceDate,
            description: '시도 요약 카드와 동일한 기준일입니다.',
          },
          {
            label: '선거',
            sourceType: electionState.data?.sourceType,
            sourceDate: electionState.data?.sourceDate,
            description: electionState.data?.electionName,
          },
          {
            label: '추세',
            sourceType: populationTrendState.data?.[populationTrendState.data.length - 1]?.sourceType,
            sourceDate: populationTrendState.data?.[populationTrendState.data.length - 1]?.sourceDate,
            description: 'snapshot 기반 시계열 추세',
          },
        ]}
      />

      <div className="card-grid">
        <PopulationSummaryCard
          title="시도 인구 요약"
          record={provincePopulationState.data}
          primaryMetric="sexRatio"
        />
        <PopulationMiniChart record={provincePopulationState.data} />
        <ElectionSummaryCard title="주요 선거 결과" result={electionState.data} />
        <ElectionResultChart results={electionResultsState.data ?? []} />
      </div>

      <div className="hero-metrics">
        <StatCard
          description="테마맵 핵심 지표"
          label="고령화율"
          value={formatPercent(calculateAgingRate(provincePopulationState.data))}
        />
        <StatCard
          description="테마맵 핵심 지표"
          label="20-39세 비율"
          value={formatPercent(calculateYouth2039Rate(provincePopulationState.data))}
        />
        <StatCard
          description="기본 선거 기준"
          label="투표율"
          value={
            electionState.data ? formatPercent(electionState.data.turnoutRate) : '준비중'
          }
        />
      </div>

      <div className="hero-metrics">
        <StatCard
          description="snapshot 시계열 기준"
          label="인구 변화율"
          value={formatPercent(calculatePopulationGrowthRate(populationTrendState.data ?? []))}
        />
        <StatCard
          description="시계열 변화"
          label="고령화율 변화"
          value={`${calculateAgingRateChange(agingTrendState.data ?? []).toFixed(1)}%p`}
        />
        <StatCard
          description="최근 선거 추세"
          label="투표율 변화"
          value={`${calculateTurnoutChange(turnoutTrendState.data ?? []).toFixed(1)}%p`}
        />
      </div>

      <article className="panel">
        <div className="panel-head">
          <span className="eyebrow">추세 보기</span>
          <h2>{provinceState.data.shortName} 시계열 비교</h2>
        </div>
        <div className="button-row">
          <Link
            className="button button-secondary"
            to={`${ROUTES.trends}?metric=totalPopulation&regionA=${provinceCode}`}
          >
            인구 추세 보기
          </Link>
          <Link
            className="button button-secondary"
            to={`${ROUTES.trends}?metric=turnoutRate&regionA=${provinceCode}`}
          >
            선거 추세 보기
          </Link>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head">
          <span className="eyebrow">하위 지역 검색</span>
          <h2>{provinceState.data.shortName} 시군구 / 행정동 찾기</h2>
        </div>
        <RegionSearchBox
          scopeProvinceCode={provinceCode}
          title="시군구 / 행정동 검색"
        />
      </article>

      <div className="detail-grid">
        <div className="panel panel-stack">
          <div className="panel-head">
            <span className="eyebrow">시군구 상세</span>
            <h2>{provinceState.data.shortName} 시군구 구조</h2>
          </div>
          {detailError ? (
            <ErrorPanel message={detailError} />
          ) : cityBoundariesState.loading && !cityBoundariesState.data ? (
            <LoadingPanel message="시군구 경계를 불러오는 중입니다." />
          ) : (
            <AdminMap
              data={cityBoundariesState.data}
              emptyMessage="이 시도는 아직 시군구 경계 샘플이 없습니다. 목록과 데이터 구조는 준비되어 있습니다."
              metricLookup={populationLookup}
              selectedCode={selectedCityCode}
              onFeatureClick={(cityCode) => navigate(ROUTES.city(provinceCode, cityCode))}
            />
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="eyebrow">시군구 리스트</span>
            <h2>도시/구/군 진입점</h2>
          </div>
          <ul className="admin-list">
            {displayedCities.map((city) => (
              <li key={city.code}>
                <Link className="admin-list-link" to={ROUTES.city(provinceCode, city.code)}>
                  <div>
                    <strong>{city.name}</strong>
                    <p>
                      {city.adminType} · 하위 행정동 {city.townCount}개 기준
                    </p>
                  </div>
                  <span>{formatPopulation(populationLookup[city.code] ?? 0)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="helper-text">
            population join: {joinResult.status} · election join: {electionJoinResult.status}
            {' '}· 모든 시도는 시군구 지도를 lazy loading으로 불러오며, 실제 SGIS 기반 snapshot geometry를 우선 사용합니다.
          </p>
        </div>
      </div>
    </section>
  )
}
