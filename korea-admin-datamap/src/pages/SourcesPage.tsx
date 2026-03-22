import { APP_CONFIG } from '@/config/app'
import { formatFallbackReasonLabel } from '@/config/dataSourcePolicy'
import { EmptyPanel } from '@/components/common/StatePanel'
import { getDataSourceStatuses } from '@/services/dataSourceStatusService'

const sourceBadgeLabel = {
  real: 'REAL',
  snapshot: 'SNAPSHOT',
  mock: 'MOCK',
} as const

const geometrySourceLabel = {
  'sgis-real': 'SGIS real',
  'snapshot-file': 'Snapshot file',
  'generated-grid': 'Generated grid',
  unknown: 'Unknown',
} as const

export function SourcesPage() {
  const sourceStatuses = getDataSourceStatuses()
  const operationalSummary = sourceStatuses
    .filter((status) => status.key === 'boundary' || status.key === 'population' || status.key === 'election')

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">데이터 설계</span>
          <h1>Sources & Layers</h1>
        </div>
        <p>
          경계, 인구, 선거 데이터를 독립 계층으로 관리하고, mock / snapshot / real API
          소스 모드를 교체할 수 있게 설계했습니다.
        </p>
      </div>

      <div className="card-grid">
        <article className="panel">
          <span className="eyebrow">운영 요약</span>
          <h2>Current Selection</h2>
          <ul className="simple-list">
            {operationalSummary.map((status) => (
              <li key={`summary-${status.key}`}>
                {status.label}: {status.currentSourceType ?? 'snapshot'}
                {status.key === 'boundary' && status.geometrySource
                  ? ` (${geometrySourceLabel[status.geometrySource] ?? status.geometrySource})`
                  : ''}
                {status.runtimeStatus === 'fallback' || status.runtimeStatus === 'error'
                  ? ` fallback (${formatFallbackReasonLabel(status.fallbackReasonCode)})`
                  : ''}
              </li>
            ))}
          </ul>
          <p className="helper-text">
            Boundary는 `REAL + sgis-real`, Population은 `REAL` 또는 `SNAPSHOT fallback`,
            Election은 현재 승인 상태에 따라 `SNAPSHOT fallback (승인 필요)`로 보이는 것이
            정상입니다.
          </p>
          {operationalSummary.some(
            (status) =>
              status.requestedMode === 'real' && status.currentSourceType !== 'real',
          ) ? (
            <p className="helper-text">
              실제 데이터 연결 안 됨: 일부 도메인은 현재 snapshot/mock fallback을 사용 중입니다.
            </p>
          ) : null}
        </article>

        <article className="panel">
          <span className="eyebrow">현재 모드</span>
          <h2>{APP_CONFIG.dataSourceMode}</h2>
          <ul className="simple-list">
            <li>mock: 로컬 타입 안전 데이터로 빠르게 개발</li>
            <li>snapshot: 정적 스냅샷 경계와 통계 데이터를 우선 사용</li>
            <li>real: API 클라이언트 호출 후 snapshot fallback</li>
          </ul>
        </article>

        <article className="panel">
          <span className="eyebrow">행정 master</span>
          <h2>Code-Based Admin Data</h2>
          <ul className="simple-list">
            <li>`src/data/admin/provinces.json` 실제 17개 시도 master</li>
            <li>`src/data/admin/cities.json` 실제 전체 시군구 master</li>
            <li>`src/data/admin/towns.json` 실제 행정동/행정읍/행정면 master</li>
            <li>`src/data/admin/adminDongLegalMappings.json` 행정동 ↔ 법정동 매핑 테이블</li>
            <li>서울은 전체 25개 자치구와 20개 강서구 행정동 기준으로 목록/검색이 동작</li>
          </ul>
        </article>

        <article className="panel">
          <span className="eyebrow">인구 계층</span>
          <h2>Population Pipeline</h2>
          <ul className="simple-list">
            <li>`src/services/populationService.ts` snapshot &gt; mock fallback</li>
            <li>`src/services/api/populationApi.ts` real API placeholder</li>
            <li>`src/utils/populationNormalizer.ts` 응답 정규화</li>
          </ul>
        </article>

        <article className="panel">
          <span className="eyebrow">선거 계층</span>
          <h2>Election Pipeline</h2>
          <ul className="simple-list">
            <li>`src/services/electionService.ts` real → snapshot → mock facade</li>
            <li>`src/services/api/electionApi.ts` 중앙선관위 API wrapper</li>
            <li>`src/utils/electionNormalizer.ts` 선거 응답 정규화</li>
            <li>`src/utils/electionRegionMapper.ts` 지역명 → admin code 매핑</li>
            <li>NEC 401/403 승인·권한 응답은 `approval_required`로 기록하고 snapshot fallback을 운영 정책으로 유지</li>
          </ul>
        </article>

        <article className="panel">
          <span className="eyebrow">경계 데이터</span>
          <h2>Boundary Pipeline</h2>
          <ul className="simple-list">
            <li>`src/data/snapshot/boundaries/` snapshot 경계 lazy loader</li>
            <li>`src/services/geoService.ts` snapshot / real boundary facade</li>
            <li>`src/services/api/sgisApi.ts` SGIS 연동 placeholder</li>
            <li>`src/data/geo/` raw geometry 저장소</li>
            <li>실제 province 경계와 전국 city 경계 snapshot을 SGIS geometry 기준으로 생성</li>
            <li>real 경계는 SGIS 이름을 official adminCode로 다시 매핑</li>
            <li>서울을 포함한 전국 시도별 시군구 snapshot이 실제 SGIS 경계를 저장한 로컬 파일을 사용</li>
            <li>town 경계는 행정동 master 기준으로 SGIS real 우선 매핑하며, `제1동 ↔ 1동` 이름 차이도 보정</li>
            <li>generated grid fallback은 기본 비활성화되어 실제 geometry가 없으면 빈 상태로 처리</li>
            <li>기준시점 예시: SGIS 2025 경계 snapshot</li>
          </ul>
        </article>

        <article className="panel">
          <span className="eyebrow">경계 환경변수</span>
          <h2>SGIS / External Boundary API</h2>
          <ul className="simple-list">
            <li>`VITE_SGIS_SERVICE_ID` SGIS 서비스 아이디</li>
            <li>`VITE_SGIS_SECURITY_KEY` SGIS 보안 키</li>
            <li>`VITE_SGIS_API_BASE_URL` 외부 경계 API 또는 SGIS base URL</li>
          </ul>
        </article>

        <article className="panel">
          <span className="eyebrow">실데이터 API</span>
          <h2>API Modules</h2>
          <ul className="simple-list">
            <li>`src/services/api/moisApi.ts` 행정안전부 주민등록 인구 API 구조</li>
            <li>`src/services/api/necApi.ts` 중앙선관위 투개표정보 API 구조</li>
            <li>`src/services/api/seoulOpenApi.ts` 서울열린데이터광장 API 구조</li>
            <li>`src/services/api/sgisApi.ts` SGIS 행정경계 API 구조</li>
            <li>API 실패 시 각 서비스는 snapshot fallback 유지</li>
          </ul>
        </article>

        <article className="panel">
          <span className="eyebrow">실행 상태</span>
          <h2>Runtime Source Status</h2>
          {sourceStatuses.length === 0 ? (
            <EmptyPanel className="state-panel-compact" message="표시할 소스 상태가 없습니다." />
          ) : (
            <div className="source-status-grid">
              {sourceStatuses.map((status) => (
                <article className="source-status-card" key={status.key}>
                  <div className="source-status-head">
                    <div>
                      <span className="eyebrow">{status.label}</span>
                      <h3>{status.key}</h3>
                    </div>
                    <span
                      className={`source-type-badge source-type-${status.currentSourceType ?? 'snapshot'}`}
                    >
                      {sourceBadgeLabel[status.currentSourceType ?? 'snapshot']}
                    </span>
                  </div>
                  <p>{status.detail}</p>
                  <dl className="source-status-meta">
                    <div>
                      <dt>소스 우선순위</dt>
                      <dd>{status.sourcePriority}</dd>
                    </div>
                    <div>
                      <dt>요청 모드</dt>
                      <dd>{status.requestedMode}</dd>
                    </div>
                    <div>
                      <dt>런타임 상태</dt>
                      <dd>{status.runtimeStatus}</dd>
                    </div>
                    <div>
                      <dt>Status Code</dt>
                      <dd>{status.lastStatusCode ?? 'n/a'}</dd>
                    </div>
                    <div>
                      <dt>Current Source</dt>
                      <dd>{status.currentSourceType ?? 'n/a'}</dd>
                    </div>
                    <div>
                      <dt>Request Sent</dt>
                      <dd>{status.requestSent === undefined ? 'n/a' : status.requestSent ? 'yes' : 'no'}</dd>
                    </div>
                    <div>
                      <dt>Response Received</dt>
                      <dd>
                        {status.responseReceived === undefined
                          ? 'n/a'
                          : status.responseReceived
                            ? 'yes'
                            : 'no'}
                      </dd>
                    </div>
                    <div>
                      <dt>Parse Success</dt>
                      <dd>
                        {status.parseSuccess === undefined
                          ? 'n/a'
                          : status.parseSuccess
                            ? 'yes'
                            : 'no'}
                      </dd>
                    </div>
                    <div>
                      <dt>Fallback</dt>
                      <dd>{status.fallbackSource}</dd>
                    </div>
                    <div>
                      <dt>Geometry Source</dt>
                      <dd>
                        {status.geometrySource
                          ? (geometrySourceLabel[status.geometrySource] ?? status.geometrySource)
                          : 'n/a'}
                      </dd>
                    </div>
                    <div>
                      <dt>기준 시각</dt>
                      <dd>{status.lastRequestAt ?? 'n/a'}</dd>
                    </div>
                    <div>
                      <dt>환경변수</dt>
                      <dd>{status.configured ? 'configured' : 'missing'}</dd>
                    </div>
                  </dl>
                  <p className="helper-text">
                    fallback reason: {status.fallbackReasonLabel}
                  </p>
                  <p className="helper-text">
                    selected source reason: {status.selectedSourceReason ?? 'n/a'}
                  </p>
                  {status.fallbackReason ? (
                    <p className="helper-text">{status.fallbackReason}</p>
                  ) : null}
                  <p className="helper-text source-request-url">
                    request url: {status.lastRequestUrl ?? 'n/a'}
                  </p>
                  {status.responsePreview ? (
                    <p className="helper-text source-request-url">
                      response preview: {status.responsePreview}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <span className="eyebrow">검증</span>
          <h2>Join Validation</h2>
          <ul className="simple-list">
            <li>boundary 와 admin master 코드 비교</li>
            <li>population / election 데이터 간 admin code 교차 검증</li>
            <li>누락/level/parentCode 불일치 시 브라우저 콘솔에 상세 로그 출력</li>
            <li>인구 / 선거 / 경계 기준시점 차이를 화면과 문서에서 분리 안내</li>
            <li>초기 적재 단계에서 데이터 품질 확인 가능</li>
          </ul>
        </article>

        <article className="panel">
          <span className="eyebrow">검색 / 비교</span>
          <h2>Search & Compare Flow</h2>
          <ul className="simple-list">
            <li>`src/services/searchService.ts` admin master 기반 부분 일치 검색</li>
            <li>`src/components/RegionSearchBox.tsx` 자동완성 검색 UI</li>
            <li>`src/services/comparisonService.ts` 인구 / 선거 비교 facade</li>
            <li>`/compare`에서 두 지역을 선택해 차트와 요약 카드 비교</li>
          </ul>
        </article>

        <article className="panel">
          <span className="eyebrow">시계열</span>
          <h2>Time Series Flow</h2>
          <ul className="simple-list">
            <li>`src/data/snapshot/time-series/` snapshot 시계열 데이터</li>
            <li>`src/services/timeSeriesService.ts` adminCode 기준 시계열 facade</li>
            <li>`/trends`에서 sourceType / sourceDate와 함께 추세 비교 표시</li>
            <li>snapshot이 비어 있으면 current population / election 값에서 파생 시계열 생성</li>
          </ul>
        </article>

        <article className="panel">
          <span className="eyebrow">테마맵</span>
          <h2>Thematic Map Flow</h2>
          <ul className="simple-list">
            <li>`src/config/thematicMetrics.ts` 지표 정의와 기본 색상 스케일</li>
            <li>`src/services/thematicMapService.ts` 지표 계산과 adminCode join</li>
            <li>`src/utils/metricCalculators.ts` 비율 및 선거 지표 계산</li>
            <li>`src/utils/colorScale.ts` 색상 구간과 범례 생성</li>
            <li>`/map`에서 지표 선택 후 색상형 분석 지도 표시</li>
          </ul>
        </article>
      </div>
    </section>
  )
}
