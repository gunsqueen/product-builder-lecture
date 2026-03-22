# Korea Admin Datamap

대한민국 전국 단위 행정 데이터맵 웹앱입니다. 기존 서울시 전용 프로젝트를 수정하지 않고, 전국 확장과 정적 배포를 전제로 React + Vite + TypeScript로 새로 구성했습니다.

현재는 `시도 -> 시군구 -> 행정동(행정읍/행정면 포함)` 구조와 `행정코드 master / 경계 / 인구 / 선거 / 검색 / 비교 / 시계열 / 테마맵` 계층이 분리되어 있으며, 행정 master는 실제 전체 코드 기준으로 확장되어 있습니다. 통계와 경계는 `real / snapshot / mock`을 함께 유지하면서 fallback 하도록 설계되어 있습니다.

## 현재 구현 범위

- 전국 시도 지도
- 시도 상세에서 시군구 지도 lazy loading
- 시군구 상세에서 행정동 구조와 일부 행정동 경계 표시
- 실제 전체 시도 master 17개 반영
- 실제 전체 시군구 master 268개 반영
- 실제 전체 행정동/행정읍/행정면 master 3,603개 반영
- 행정동 ↔ 법정동 매핑 21,372건 반영
- 서울특별시 전체 25개 자치구 반영
- 실제 SGIS geometry 기반 전국 시도 경계 반영
- 실제 SGIS geometry 기반 전국 시도별 시군구 경계 snapshot 반영
- 행정동 상세 라우트와 인구 / 선거 카드
- 인구 계층: `mock / snapshot / real API 우선 + fallback`
- 선거 계층: `mock / snapshot / real API 우선 + fallback`
- 경계 계층: `real SGIS 우선 / snapshot fallback / dynamic import`
- 검색 계층: admin master 기반 지역 검색
- 비교 계층: 두 지역의 인구 / 선거 비교
- 시계열 계층: 연도별 인구 / 선거 추세 조회와 지역 간 추세 비교
- 테마맵 계층: 인구 / 선거 지표 기반 색상형 분석 지도
- `/elections`, `/sources`, `/compare`, `/trends` 페이지
- admin code 기준 join validation 콘솔 로그
- 공통 Loading / Error / Empty UI
- route 단위 code splitting과 경계 lazy loading

## 기술 스택

- React 19
- Vite
- TypeScript
- React Router
- Leaflet + React Leaflet
- Recharts
- 정적 배포 가능 구조
- 추후 Capacitor 확장 고려

## 라우트

- `/`
- `/map`
- `/compare`
- `/trends`
- `/province/:provinceCode`
- `/province/:provinceCode/city/:cityCode`
- `/province/:provinceCode/city/:cityCode/town/:townCode`
- `/elections`
- `/sources`

## 페이지별 설명

- `/`: 프로젝트 개요, 핵심 기능 진입점
- `/map`: 전국 시도 테마맵과 지표 선택, 범례, 검색 연동
- `/province/:provinceCode`: 시도 요약, 시군구 목록, 인구/선거/추세 요약
- `/province/:provinceCode/city/:cityCode`: 시군구 요약, 행정동 구조, 인구/선거/추세 요약
- `/province/:provinceCode/city/:cityCode/town/:townCode`: 행정동 단위 요약과 기준일 표시
- `/compare`: 두 지역의 인구/선거 비교와 차트 비교
- `/trends`: 단일 지역 또는 두 지역의 연도별 추세 비교
- `/elections`: 선거 선택과 선거 결과 요약 확인
- `/sources`: 현재 데이터 계층, 런타임 source 상태, fallback 사유 확인

## 실행 방법

```bash
npm install
npm run dev
npm run build
npm run lint
npm run verify:boundaries
```

개발 서버를 실행하기 전에 프로젝트 루트에 `.env.local` 파일을 만들고 API 키를 넣습니다.

```bash
cp .env.example .env.local
```

`.env.local`에는 최소한 아래 키를 넣으면 됩니다.

```bash
VITE_MOIS_API_KEY=
VITE_MOIS_API_BASE_URL=/mois
VITE_MOIS_API_PATH=resident-population
VITE_NEC_API_KEY=
VITE_NEC_API_BASE_URL=/nec
VITE_NEC_API_PATH=winner-info
VITE_SEOUL_OPEN_API_KEY=
VITE_SGIS_SERVICE_ID=
VITE_SGIS_SECURITY_KEY=
VITE_SGIS_API_BASE_URL=
```

정적 호스팅에서 rewrite 설정이 어렵다면 hash router를 사용할 수 있습니다.

```bash
VITE_USE_HASH_ROUTER=true npm run dev
```

배포 전 최소 확인:

- `npm run lint`
- `npm run build`
- 환경변수 파일에 실제 배포용 키 입력 여부 확인
- `VITE_DATA_SOURCE_MODE`가 운영 의도와 맞는지 확인

## 환경변수

`.env.example`

```bash
VITE_DATA_SOURCE_MODE=mock
VITE_USE_HASH_ROUTER=false
VITE_DEBUG_DATA_SOURCES=false
VITE_MOIS_API_KEY=
VITE_MOIS_API_BASE_URL=/mois
VITE_MOIS_API_PATH=resident-population
VITE_NEC_API_KEY=
VITE_NEC_API_BASE_URL=/nec
VITE_NEC_API_PATH=winner-info
VITE_SEOUL_OPEN_API_KEY=
VITE_SEOUL_OPEN_API_BASE_URL=
VITE_SGIS_SERVICE_ID=
VITE_SGIS_SECURITY_KEY=
VITE_SGIS_API_BASE_URL=
VITE_SGIS_AUTH_PATH=
VITE_SGIS_BOUNDARY_PATH=
VITE_SGIS_BOUNDARY_YEAR=2021
VITE_ENABLE_GENERATED_BOUNDARY_FALLBACK=false
```

변수 설명:

- `VITE_MOIS_API_BASE_URL`: MOIS 프록시 base URL. 브라우저 CORS 때문에 개발/운영 모두 같은 origin 프록시 경로를 권장
- `VITE_MOIS_API_PATH`: MOIS 프록시 path prefix. 현재 권장값은 `resident-population`
- `VITE_NEC_API_BASE_URL`: NEC 프록시 base URL. 브라우저에서 403/approval 상태를 정확히 읽기 위해 same origin 프록시를 권장
- `VITE_NEC_API_PATH`: NEC 프록시 path prefix. 현재 권장값은 `winner-info`
- `VITE_SGIS_API_BASE_URL`: SGIS 경계 API 호스트
- `VITE_ENABLE_GENERATED_BOUNDARY_FALLBACK`: 개발 중에만 generated grid fallback을 강제로 허용
- `VITE_DATA_SOURCE_MODE`: `mock`, `snapshot`, `real`
- `VITE_DEBUG_DATA_SOURCES`: 개발 모드 상세 로그 on/off
- `VITE_USE_HASH_ROUTER`: 정적 호스팅에서 history fallback이 없을 때 사용

운영 환경 변수 표:

| 도메인 | 필수 변수 | 선택 변수 | 누락 시 동작 |
| --- | --- | --- | --- |
| MOIS population | `VITE_MOIS_API_KEY`, `VITE_MOIS_API_BASE_URL`, `VITE_MOIS_API_PATH` | 없음 | `missing_api_key` 또는 `missing_path`로 snapshot -> mock fallback |
| NEC election | `VITE_NEC_API_KEY`, `VITE_NEC_API_BASE_URL`, `VITE_NEC_API_PATH` | 없음 | 승인 전 403이면 `approval_required`로 snapshot -> mock fallback |
| SGIS boundary | `VITE_SGIS_SERVICE_ID`, `VITE_SGIS_SECURITY_KEY` | `VITE_SGIS_API_BASE_URL`, `VITE_SGIS_AUTH_PATH`, `VITE_SGIS_BOUNDARY_PATH`, `VITE_SGIS_BOUNDARY_YEAR` | `missing_credentials` 또는 API 오류로 snapshot fallback |
| Seoul Open | `VITE_SEOUL_OPEN_API_KEY` | `VITE_SEOUL_OPEN_API_BASE_URL` | 현재 화면 미연결, wrapper만 유지 |

현재 API 모듈:

- `src/services/api/moisApi.ts`
- `src/services/api/necApi.ts`
- `src/services/api/seoulOpenApi.ts`
- `src/services/api/sgisApi.ts`

`.env.local` 설정 방법:

1. 프로젝트 루트에 `.env.local` 파일 생성
2. `.env.example`을 참고해 API 키 입력
3. 개발 서버 실행 전에 저장
4. 키를 바꿨다면 `npm run dev`를 다시 실행

개발 모드에서는 API 키가 비어 있으면 각 API 서비스에서 경고를 출력합니다.

실행 검증 메모:

- `VITE_DATA_SOURCE_MODE=real` 이고 관련 키가 있으면 real API를 먼저 시도합니다.
- real API 호출이 실패하거나 필수 환경변수가 없으면 자동으로 snapshot fallback으로 내려갑니다.
- 개발 모드에서 `VITE_DEBUG_DATA_SOURCES=true` 또는 기본 `import.meta.env.DEV` 상태이면 콘솔에 실제 사용된 소스와 fallback 사유를 출력합니다.
- `/sources` 페이지에서 population / election / boundary / seoul open data의 현재 런타임 상태를 확인할 수 있습니다.
- `/sources` 페이지에는 current sourceType, last status code, fallback reason, last request timestamp도 표시됩니다.
- `npm run verify:boundaries`로 서울 25구와 주요 경기 시군구의 SGIS real 경계 count를 점검할 수 있습니다.

## 데이터 계층 요약

전체 원칙:

- `mock`: UI/구조 개발용 최소 데이터
- `snapshot`: 정적 샘플과 검증 기준 데이터
- `real`: 외부 API 우선 호출 후 실패 시 snapshot fallback
- 모든 서비스는 최종적으로 `adminCode`, `sourceType`, `sourceDate` 기준으로 정규화

### 행정 master

- `src/data/admin/*.json`
- `src/services/adminService.ts`
- `src/services/adminDataService.ts`
- `scripts/generate-admin-master.mjs`
- `scripts/generate-admin-dong-master.mjs`

역할:

- 시도/시군구는 code.go.kr 전체 코드 기준 master를 사용
- town 레벨은 MOIS 행정기관코드(`KIKcd_H`) 기준으로 실제 행정동/행정읍/행정면 master를 생성
- 법정동 조인은 MOIS `KIKmix` 기반 `adminDongLegalMappings.json`으로 분리 관리
- 현재 master 기준:
  - 시도 17개
  - 시군구 268개
  - 행정동/행정읍/행정면 3,603개
- 검색과 비교의 기준 코드 데이터 제공
- 서울은 전체 25개 자치구가 목록, 검색, 상세 페이지에 모두 반영
- 서울 강서구 20개 행정동, 수원시 장안구 10개 행정동처럼 실제 행정동 개수 기준으로 정리
- 기존 샘플 town route는 `legacyTownAliases.json`으로 호환 유지

### 경계 boundaries

- `src/types/boundary.ts`
- `src/utils/boundaryNormalizer.ts`
- `src/services/geoService.ts`
- `src/services/api/sgisApi.ts`
- `src/data/geo/`
- `src/data/snapshot/boundaries/`

구조:

- raw geometry는 `src/data/geo/`
- snapshot boundary loader는 `src/data/snapshot/boundaries/`
- real 모드는 SGIS `hadmarea.geojson` 호출을 우선 시도하고 실패 시 snapshot fallback
- province snapshot은 실제 SGIS geometry를 저장한 로컬 파일을 사용
- city snapshot은 서울을 포함한 전국 시도별 실제 SGIS geometry를 저장한 로컬 파일을 사용
- generated rectangle/grid fallback은 기본 비활성화되어 실제 geometry가 없으면 빈 상태 UI로 처리
- 경계는 모두 `BoundaryFeatureCollection`으로 정규화
- SGIS real geometry는 boundary normalizer 단계에서 Leaflet용 WGS84 좌표로 변환
- SGIS 인증과 경계 경로는 `VITE_SGIS_*` 환경변수로 덮어쓸 수 있음
- province / city real boundary는 SGIS 이름을 official adminCode로 매핑해 join 안정성을 맞춤
- town real boundary는 SGIS 응답의 `등촌1동 ↔ 등촌제1동` 같은 이름 차이를 정규화해 official 행정동 master와 다시 매핑
- town snapshot은 아직 일부 지역만 직접 포함되어 있고, 그 외에는 real SGIS 성공 시 우선 사용
- 운영 기준 경계 정책은 `real(SGIS) -> snapshot`이며, generated grid는 기본 비활성화 상태입니다.

### population

- `src/types/population.ts`
- `src/services/populationService.ts`
- `src/services/api/moisApi.ts`
- `src/utils/populationNormalizer.ts`

동작:

- `real` 모드에서는 MOIS API를 먼저 호출
- 응답은 MOIS 주민등록 사이트의 실제 CSV/HTML 응답을 파싱해 `PopulationStats`로 정규화
- real 데이터가 일부 필드만 줄 경우 snapshot 값으로 빈 필드를 보완
- API 실패 시 snapshot + mock fallback 유지
- 시도/시군구는 MOIS CSV export, 행정동은 MOIS HTML table을 파싱합니다.
- MOIS 사이트는 브라우저 CORS를 직접 허용하지 않으므로, 개발 환경에서는 `VITE_MOIS_API_BASE_URL=/mois`, `VITE_MOIS_API_PATH=resident-population`과 Vite proxy를 함께 사용합니다.
- 정적 배포에서는 동일한 `/mois/resident-population/*` 경로를 reverse proxy 또는 edge function으로 연결해야 real population이 동작합니다.

### elections

- `src/types/election.ts`
- `src/services/electionService.ts`
- `src/config/electionApiProfiles.ts`
- `src/services/api/necApi.ts`
- `src/utils/electionNormalizer.ts`
- `src/utils/electionRegionMapper.ts`

동작:

- `real` 모드에서는 NEC API를 먼저 호출
- 내부 `electionId`를 NEC 요청 파라미터 `sgId / sgTypecode / sdName / wiwName / sggName / emdName` 구조로 변환
- 현재 real profile은 최소 `광역단체장 / 기초단체장 / 국회의원` 3종을 유지
- 지역명 기반 응답도 `adminCode` 기준으로 다시 정규화
- `서울 강서구`, `서울 강서구갑`, `서울 강서구을` 같은 지역명도 city adminCode로 다시 매핑하도록 보정
- 개발 환경에서는 `VITE_NEC_API_BASE_URL=/nec`, `VITE_NEC_API_PATH=winner-info`와 Vite proxy를 함께 사용합니다.
- 현재 실제 호출은 401/403 승인·권한 응답이 확인되므로, 승인 상태 확인 전까지 snapshot fallback을 공식 운영 정책으로 유지합니다.

### search

- `src/types/search.ts`
- `src/services/searchService.ts`
- `src/utils/searchNormalizer.ts`
- `src/components/RegionSearchBox.tsx`

### comparison

- `src/types/comparison.ts`
- `src/services/comparisonService.ts`
- `src/components/RegionComparisonPanel.tsx`
- `src/pages/ComparePage.tsx`

### time series

- `src/types/timeSeries.ts`
- `src/services/timeSeriesService.ts`
- `src/utils/timeSeriesMetrics.ts`
- `src/data/snapshot/time-series/`
- `src/components/TimeSeriesChart.tsx`
- `src/components/TimeSeriesComparisonChart.tsx`
- `src/components/TimeSeriesSummaryCard.tsx`
- `src/pages/TrendsPage.tsx`

동작:

- snapshot 기반 연도별 인구 / 선거 추세 조회
- adminCode 기준으로 단일 지역과 두 지역 비교 지원
- sourceType / sourceDate를 카드와 차트에 함께 표시
- real API 연계가 추가되어도 같은 인터페이스를 유지하도록 설계

### thematic map

- `src/types/thematicMap.ts`
- `src/config/thematicMetrics.ts`
- `src/services/thematicMapService.ts`
- `src/utils/metricCalculators.ts`
- `src/utils/colorScale.ts`
- `src/components/ThematicMapControl.tsx`
- `src/components/MapLegend.tsx`

## 테마맵 기능 설명

현재 테마맵은 `/map` 페이지를 강화하는 방식으로 들어가 있습니다.

사용 흐름:

1. 지표 선택
2. 시도 경계 로드
3. 선택 지표를 `adminCode` 기준으로 경계와 join
4. 색상 구간 계산
5. 범례와 tooltip 표시
6. 클릭 시 기존 상세 페이지 이동 유지

즉, 기존 지도/검색/상세 이동 흐름을 깨지 않고 분석 지도 레이어만 추가한 구조입니다.

## 지원 지표 목록

현재 지원 지표:

- `totalPopulation`
- `householdCount`
- `agingRate`
- `youth2039Rate`
- `turnoutRate`
- `topCandidateVoteRate`
- `topPartyVoteRate`

정의 위치:

- `src/config/thematicMetrics.ts`

각 지표는 다음 정보를 가집니다.

- `key`
- `label`
- `description`
- `sourceDomain`
- `formatter`
- `defaultColorScale`
- `scaleMethod`

## 계산 방식 설명

관련 파일:

- `src/utils/metricCalculators.ts`
- `src/services/thematicMapService.ts`

현재 계산식:

- `agingRate`: `age65plus / totalPopulation * 100`
- `youth2039Rate`: `(age20to29 + age30to39) / totalPopulation * 100`
- `turnoutRate`: 기본 선거 결과의 투표율
- `topCandidateVoteRate`: 지역별 최고 후보 득표율
- `topPartyVoteRate`: 정당별 득표수를 합산한 뒤 최고 비율 계산

안전 처리:

- 0 나누기 방지
- null / undefined 방어
- 데이터가 없으면 `null` 처리

## 색상 구간과 범례

관련 파일:

- `src/utils/colorScale.ts`
- `src/components/MapLegend.tsx`

현재 구조:

- `quantile` 또는 `equalInterval` 방식 지원
- 데이터 없음 색상 별도 제공
- 범례는 현재 지표, 값 구간, 데이터 없음 색상을 함께 표시

데이터 없음 기본 색상:

- `#d6e1e3`

## 데이터 없음 처리 방식

테마맵은 모든 region에 대해 item을 만들되, 값이 계산되지 않으면 다음처럼 처리합니다.

- `value = null`
- `formattedValue = 데이터 없음`
- `colorClass = noDataColor`

또한 join validator에 다음이 기록됩니다.

- population 누락 코드
- election 누락 코드
- metric 계산 불가 코드 수와 목록

## 실제 API 연동 상태

현재 구조는 다음 상태를 전제로 동작합니다.

- population: `real -> snapshot -> mock`
- election: `real -> snapshot -> mock`
- boundary: `real -> snapshot`
- seoul open: 현재 공통 fetch wrapper만 준비되어 있고 화면 레이어에는 아직 직접 연결하지 않음

현재 운영 기준:

- boundary: SGIS real 호출 가능 시 실제 경계를 우선 선택
- population: MOIS path가 확정되기 전까지 snapshot fallback이 정상 동작
- election: NEC 승인/권한 상태 확인 전까지 snapshot fallback이 정상 동작
- admin master: 실제 전체 코드 기준으로 이미 확장됨

시계열 구현 범위:

- 현재는 `src/data/snapshot/time-series/` 기반 snapshot 구현
- 지원 지표: `totalPopulation`, `agingRate`, `youth2039Rate`, `turnoutRate`, `firstSecondGap`
- province / city / town 확장 가능 구조로 설계

주의:

- data.go.kr 계열 API는 서비스마다 경로와 파라미터가 조금씩 달라서 `VITE_MOIS_API_PATH`, `VITE_NEC_API_PATH`를 실제 서비스 경로에 맞춰 넣는 편이 안전합니다.
- SGIS 경계는 공식 `hadmarea.geojson` 패턴을 기준으로 호출하며 `VITE_SGIS_BOUNDARY_YEAR`로 연도 기준을 맞출 수 있습니다.
- 이 저장소에 `.env`가 없으면 real 호출 검증은 실행되지 않고 fallback만 동작합니다.

실제 API 전환 방법:

1. `.env.local`에 API 키 입력
2. `VITE_DATA_SOURCE_MODE=real` 설정
3. population은 `VITE_MOIS_API_BASE_URL`과 `VITE_MOIS_API_PATH`를 실제 서비스 기준으로 지정
4. election은 `VITE_NEC_API_BASE_URL`과 `VITE_NEC_API_PATH`를 확인하고, 403이면 서비스 승인 상태를 먼저 확인
5. boundary는 `VITE_SGIS_API_BASE_URL` 기준으로 real 호출을 우선 사용
6. `/sources`와 브라우저 콘솔에서 sourceType, status code, fallback reason 확인

## Sources 페이지 읽는 방법

`/sources` 페이지는 운영 점검 화면으로 쓰면 됩니다.

- `현재 모드`: 앱이 `mock`, `snapshot`, `real` 중 어떤 모드인지 표시
- `Runtime Source Status`: boundary, population, election, seoul open data별 현재 상태 표시
- `REAL / SNAPSHOT / MOCK` 뱃지: 현재 실제로 사용 중인 소스
- `소스 우선순위`: 현재 모드에서 어떤 순서로 선택하는지 표시
- `Status Code`: 마지막 API 응답 코드
- `Fallback`: 어떤 소스로 내려갔는지 표시
- `Geometry Source`: `sgis-real`, `snapshot-file`, `generated-grid` 중 실제 geometry 출처
- `fallback reason`: 왜 fallback이 발생했는지 표시
- `request url`: 마지막 요청 경로 확인용

mixed-source 경고가 보이면 boundary는 real인데 population이나 election은 snapshot일 수 있다는 뜻입니다.

boundary가 snapshot으로 보일 때 우선 확인할 항목:

1. SGIS 인증 키가 설정되어 있는지
2. official code -> SGIS code 해석이 가능한지
3. request url과 status code가 남았는지
4. fallback reason이 `missing_credentials`, `missing_profile`, `api_error` 중 무엇인지
5. `Geometry Source`가 `generated-grid`인지 `snapshot-file`인지 확인

## 운영 준비 체크리스트

real API 연결 확인 방법:

1. `.env.local` 또는 배포 환경변수에 API 키 입력
2. `VITE_DATA_SOURCE_MODE=real` 설정
3. `/sources`에서 boundary / population / election의 현재 선택 소스 확인
4. `request url`, `status code`, `fallback reason` 확인

fallback 발생 시 점검 순서:

1. 환경변수 누락 여부 확인
2. endpoint path가 정확한지 확인
3. API 승인/권한 상태 확인
4. 브라우저 네트워크 탭과 `/sources`의 status code 비교
5. 개발 모드에서 콘솔 join/source 로그 확인

MOIS endpoint path 교체 방법:

- `VITE_MOIS_API_BASE_URL`은 호스트
- `VITE_MOIS_API_PATH`는 실제 서비스 path
- path가 비어 있거나 404이면 `missing_path` 또는 `not_found`로 fallback

NEC 승인 상태 확인:

- 401/403 응답은 `approval_required`로 분류
- 운영 전 data.go.kr 또는 제공 기관 승인 상태를 먼저 확인
- `/sources`에서 Election이 `SNAPSHOT fallback (승인 필요)`로 보이면 현재 정책대로 정상 동작 중이라는 뜻입니다.

SGIS real 경계 확인:

- `/sources`에서 Boundary가 `REAL`인지 확인
- `Geometry Source`가 `sgis-real` 또는 `snapshot-file`인지 확인
- `status code`, `request url`, `last request time`으로 실제 호출 여부 확인
- 전국 시도 지도가 실제 광역 경계 형태로 보이는지 확인
- 서울 시군구 상세에서 25개 자치구가 모두 표시되는지 확인
- 다른 시도 상세에서도 시군구 경계가 실제 형태로 표시되는지 확인
- `npm run verify:boundaries`로 서울 강서구, 수원시 장안구, 성남시 수정구, 고양시 덕양구, 용인시 수지구의 행정동 rawCount/matchedCount/expectedCount를 비교
- 현재 화성시는 master가 `화성시 + 4개 구` 구조로 먼저 분기되어 있어, SGIS raw 읍면동 29개와 직접 1:1 비교되지 않습니다. 이는 boundary real 실패가 아니라 master 정합성 보정 이슈입니다.

## 아직 샘플 또는 파생 데이터인 범위

- town 경계 snapshot은 아직 일부 지역만 직접 포함
- 행정동 geometry는 현재 SGIS real 우선, snapshot은 부분 보강 상태
- population real API path가 확정되지 않은 구간은 snapshot 또는 mock fallback
- election은 NEC 승인 전까지 snapshot 또는 mock fallback
- trends는 snapshot이 없는 지역에 대해 current population / election 값에서 파생 시계열을 생성
- 경기 일부 시군구, 특히 화성시는 행정동 master 구조가 최신 경계 분기와 완전히 맞지 않을 수 있어 후속 master 보정이 필요

## Trends 페이지 사용 방법

`/trends`는 시계열 분석 화면입니다.

1. 지표를 선택합니다.
2. 지역 A를 선택하면 단일 지역 추세가 표시됩니다.
3. 지역 B를 선택하면 두 지역 비교 차트가 추가됩니다.
4. 카드와 차트에서 `sourceType`, `sourceDate`를 함께 확인합니다.

연속되지 않은 연도가 있거나 일부 연도가 비어 있으면 빈 상태 안내 문구가 먼저 표시됩니다.

## 다음 단계

- NEC 실서비스별 엔드포인트와 선거별 profile 세분화
- MOIS 실제 주민등록 세부 연령/성별 API 분리 연결
- 서울열린데이터광장 API를 생활인구 또는 시설 데이터 계층에 연결
- 경계 단순화/TopoJSON 적용으로 번들 크기 추가 최적화
- 시계열 real API 연계와 연도별 범위 확장

## 지도 / 테마맵 구조

관련 파일:

- `src/components/map/LeafletMap.tsx`
- `src/components/map/AdminMap.tsx`
- `src/components/map/BoundaryLayer.tsx`
- `src/components/ThematicMapControl.tsx`
- `src/components/MapLegend.tsx`

구조:

- `LeafletMap`: base map
- `BoundaryLayer`: 경계 렌더링과 tooltip, fillColor 처리
- `AdminMap`: 데이터 없음 fallback 포함 상위 wrapper
- `ThematicMapControl`: 지표 선택 UI
- `MapLegend`: 현재 지표 범례 표시

## 검색 / 비교와의 관계

현재 테마맵은 기존 검색/비교 구조와 충돌하지 않게 설계되어 있습니다.

- 검색은 admin master 기반
- 비교는 두 지역의 population / election만 조회
- 테마맵은 선택 지표 결과만 `/map`에 입힘
- 경계 lazy loading은 그대로 유지

즉, 검색 때문에 경계를 다시 로드하지 않고, 테마맵 때문에 비교 로직이 변경되지도 않습니다.

## Join Validation

관련 파일:

- `src/utils/joinValidator.ts`
- `src/hooks/useJoinValidation.ts`

현재 검증 내용:

- boundary 와 admin master 코드 비교
- boundary 와 population 코드 비교
- boundary 와 election 코드 비교
- thematicMap 생성 시 adminCode join 결과 로그
- metricKey별 calculation unavailable 코드 로그
- adminLevel / parentCode mismatch 로그

## 성능 메모

현재 성능 원칙:

- 모든 경계를 정적 import로 한 번에 불러오지 않음
- 시도 / 시군구 / 행정동 단위 dynamic import 유지
- route 단위 lazy import 유지
- 검색은 admin master 데이터만 사용
- 비교는 선택된 두 지역의 데이터만 조회
- 테마맵은 현재 행정단위 결과만 계산
- 지도 레이어와 통계 UI를 분리해 불필요한 전체 렌더링을 줄임

현재는 route-level code splitting을 반영해 초기 번들 부담을 줄였습니다. 이후에는 Recharts 묶음 분리나 지도 데이터 단순화를 추가로 검토할 수 있습니다.

## 유지보수 시작점

### 지표 추가

- 타입: `src/types/thematicMap.ts`
- 정의: `src/config/thematicMetrics.ts`
- 계산: `src/utils/metricCalculators.ts`
- 서비스: `src/services/thematicMapService.ts`
- 범례/컨트롤: `src/components/MapLegend.tsx`, `src/components/ThematicMapControl.tsx`

### 경계 데이터 추가

- raw geometry: `src/data/geo/`
- snapshot loader: `src/data/snapshot/boundaries/`
- 정규화: `src/utils/boundaryNormalizer.ts`
- facade: `src/services/geoService.ts`

### 인구 / 선거 데이터 추가

- population: `src/services/populationService.ts`
- election: `src/services/electionService.ts`

## 향후 확장 가능한 지표 예시

- 선거 연도별 득표율 변화
- 인구 증감률
- 주간/야간 생활인구 비율
- 시설 수 밀도
- 투표율과 고령화율 복합 지표

## 다음 단계 계획

다음 우선순위 후보:

1. 시설 데이터 계층 추가
2. 생활인구 데이터 계층 추가
3. 서울 특화 지표와 세부 경계 정교화
4. 지역 검색 랭킹 고도화와 초성 검색
5. 연도별 테마맵 비교

## 검증

최소 검증 명령:

```bash
npm run dev
npm run build
npm run lint
```

브라우저에서 함께 확인할 항목:

- `/map` 지표 변경 시 색상 변화
- tooltip에 지역명 + 지표값 표시
- 범례와 데이터 없음 색상 표시
- 시도 클릭 시 기존 상세 페이지 이동 유지
- 검색 하이라이트와 테마맵이 동시에 동작하는지 확인

## 운영형 품질 메모

- 공통 상태 UI는 `src/components/state/` 아래에서 관리
- 상세한 join/fallback 로그는 개발 모드 또는 `VITE_DEBUG_DATA_SOURCES=true`일 때만 적극 출력
- production에서는 과도한 콘솔 로그를 줄이도록 조정
- 상태 카드와 기준일 표시는 상세 페이지, Trends, Sources에서 공통 패턴으로 유지

## 배포 준비

정적 배포 기준:

- Vercel, Netlify, GitHub Pages 같은 정적 호스팅에 배포 가능
- history fallback이 없는 환경이면 `VITE_USE_HASH_ROUTER=true` 고려
- `.env.local`은 커밋하지 않고, 배포 플랫폼의 환경변수 설정 화면에 같은 이름으로 등록
- 외부 API CORS, 승인 상태, 호출 한도는 배포 전에 별도 확인 필요

권장 체크리스트:

1. `npm run lint`
2. `npm run build`
3. `.env.example` 기준으로 운영 환경변수 등록
4. `/sources`에서 runtime source 상태 확인
5. boundary/population/election mixed-source 상태를 운영 의도와 비교

## real API 완전 전환 계획

- MOIS: 실제 서비스 path 확정 후 연령/성별 세부 API까지 분리 연결
- NEC: 서비스 승인 상태 확인 후 선거 종류별 endpoint/profile 세분화
- SGIS: 경계 연도 기준과 snapshot 기준일을 정기적으로 맞추기
- Seoul Open Data: 생활인구 또는 시설 데이터 계층과 직접 연결
