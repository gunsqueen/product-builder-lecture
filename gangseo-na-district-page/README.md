# 서울시 전체 데이터맵 웹앱

서울특별시 25개 자치구와 실제 행정동 427개 구조를 기준으로 만든 React + Vite + TypeScript 정적 웹앱이다.  
이 프로젝트는 다음 3가지를 동시에 처리하도록 설계했다.

1. `fallback snapshot layer`
2. `real api layer`
3. `boundary mapping layer`

기본 실행은 공식 원본에서 만든 fallback snapshot으로 보장된다.  
서울 열린데이터광장 API 키가 없거나 GeoJSON 원본 파일이 아직 없어도 앱은 깨지지 않고 동작한다.  
실제 API가 응답하면 실시간 값을 우선 사용하고, 실패하면 동일 구조의 snapshot 데이터로 자동 복구한다.

---

## 1. 프로젝트 실행 방법

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

### 프로덕션 빌드
```bash
npm run build
```

검증 기준:
- `npm install` 성공
- `npm run dev` 성공
- `npm run build` 성공

---

## 2. 현재 구현 범위

### 라우트
- `/`
- `/map`
- `/district/:districtCode`
- `/district/:districtCode/dong/:dongCode`
- `/elections`
- `/sources`

### 화면
- 홈
- 서울시 전체 지도
- 자치구 상세
- 행정동 상세
- 선거 결과
- 데이터 출처

### 상세 탭
- 개요
- 인구
- 선거결과
- 기타

### 데이터 소스 모드
- `mock`
- `real`
- `auto`

기본값은 `auto`다.

`auto` 모드 동작:
1. 실제 API 또는 실제 경계 파일 시도
2. 실패하면 자동으로 fallback snapshot 사용
3. 현재 사용 중인 소스는 UI badge로 표시

---

## 3. 기술 스택

- React 18
- Vite
- TypeScript
- React Router DOM
- Leaflet / React Leaflet
- Recharts
- 정적 배포 가능 구조

배포 대상:
- Vercel
- Netlify
- Cloudflare Pages

---

## 4. 폴더 구조

```text
src/
  assets/
  components/
    elections/
    population/
  config/
  data/
    elections/
    mock/
      seoulDistricts.json
      seoulDongs.json
      districtPopulation.json
      dongPopulation.json
    geo/
      seoulDistricts.geojson
      seoulDongs.geojson
      seoulDistricts.simplified.geojson
      seoulDongs.simplified.geojson
  hooks/
  layouts/
  pages/
  services/
    elections/
    geo/
    population/
  styles/
  types/
  utils/

scripts/
  convert-shp-to-geojson.ts
  normalize-boundary-properties.ts
  filter-seoul-boundaries.ts
```

---

## 5. 핵심 아키텍처

### A. fallback snapshot layer
기본 렌더링에 사용되는 실제 데이터 스냅샷 레이어다.

사용 파일:
- `src/data/mock/seoulDistricts.json`
- `src/data/mock/seoulDongs.json`
- `src/data/mock/districtPopulation.json`
- `src/data/mock/dongPopulation.json`
- `src/data/elections/seoulElectionResults.json`
- `src/data/geo/seoulDistricts.geojson`
- `src/data/geo/seoulDongs.geojson`

현재 포함:
- 서울시 25개 자치구 전체
- 서울시 행정동 427개 전체
- 2026년 2월 주민등록 인구·세대수 스냅샷
- 세대원수별 세대수 스냅샷
- 2025년 대통령선거 / 2024년 국회의원선거 비례대표 실제 결과 스냅샷
- 2026년 2월 기준 행정동 경계 스냅샷

### B. real api layer
서울 열린데이터광장 Open API를 호출하는 계층이다.

사용 파일:
- `src/services/fetchDistrictList.ts`
- `src/services/fetchDongList.ts`
- `src/services/fetchSeoulOpenApi.ts`
- `src/services/fetchDistrictPopulation.ts`
- `src/services/fetchDongPopulation.ts`
- `src/services/elections/fetchElectionResults.ts`

역할:
- API 키 확인
- 실제 API 호출
- 1000건 단위 pagination
- 응답 파싱
- 자치구 인구: `octastatapi10719`
- 자치구 세대수: `octastatapi10930`
- 행정동 인구: `octastatapi10738`
- 행정동 세대수: `octastatapi10592`
- 실제 선거 JSON 우선 로드, 실패 시 legacy fallback 사용
- 내부 공통 타입으로 normalize
- 실패 시 fallback snapshot 사용

### C. boundary mapping layer
GeoJSON 속성명을 내부 표준 구조로 통일하는 계층이다.

사용 파일:
- `src/services/fetchGeoBoundary.ts`
- `src/utils/calculateArea.ts`
- `src/utils/normalizeBoundaryProperties.ts`
- `src/utils/normalizeRegionCode.ts`
- `src/utils/joinPopulationToGeo.ts`
- `src/utils/joinElectionToGeo.ts`
- `src/utils/validateElectionJoin.ts`
- `src/utils/regionMatchers.ts`
- `src/utils/validateGeoJoin.ts`

역할:
- 자치구 코드 표준화
- 행정동 코드 표준화
- 면적 속성 우선 사용, 없으면 geometry 기반 면적 계산
- GeoJSON 속성 normalize
- 통계와 경계를 code 기준으로 join
- join 실패 항목 콘솔 출력
- 강서구/마포구/송파구 검증 로그 출력

---

## 6. fallback snapshot 설명

### 6-1. `src/data/mock/seoulDistricts.json`
서울시 25개 자치구 메타데이터. 실제 행정동 경계와 2026년 2월 주민등록 통계 스냅샷을 기준으로 생성했다.

예시:
```json
[
  {
    "code": "11500",
    "name": "강서구",
    "slug": "gangseo",
    "population": 549050,
    "households": 273891,
    "administrativeDongCount": 20,
    "areaKm2": null,
    "description": "실제 행정구역 경계 및 주민등록 통계 기준 자치구입니다.",
    "centroid": [126.822656, 37.565762]
  }
]
```

### 6-2. `src/data/mock/seoulDongs.json`
행정동 전체 목록 메타데이터. 서울시 427개 행정동을 포함한다.

예시:
```json
[
  {
    "code": "1150051000",
    "districtCode": "11500",
    "districtName": "강서구",
    "name": "염창동",
    "centroid": [126.846542, 37.553308],
    "description": "실제 행정동 경계 기준 행정동입니다."
  }
]
```

### 6-3. `src/data/mock/districtPopulation.json`
자치구 인구·세대수 fallback snapshot.

예시:
```json
{
  "updatedAt": "2026-02",
  "source": "행정안전부 주민등록 인구통계 / 서울시 공식 스냅샷",
  "items": [
    {
      "areaCode": "11500",
      "areaName": "강서구",
      "level": "district",
      "districtCode": "11500",
      "totalPopulation": 549050,
      "households": 273891,
      "malePopulation": 262142,
      "femalePopulation": 286908,
      "updatedAt": "2026-02",
      "source": "행정안전부 주민등록 인구통계 / 서울시 공식 스냅샷",
      "ageGroups": [
        { "label": "0-9세", "value": 26389 },
        { "label": "10-19세", "value": 39939 },
        { "label": "20-29세", "value": 70904 }
      ],
      "householdComposition": {
        "totalHouseholds": 273891,
        "onePerson": 128468,
        "twoPerson": 64248,
        "threePerson": 43119,
        "fourPerson": 30025,
        "fiveOrMore": 8031
      },
      "averageHouseholdSize": 2
    }
  ]
}
```

### 6-4. `src/data/mock/dongPopulation.json`
행정동 인구·세대수 fallback snapshot. 서울시 427개 행정동을 포함한다.

### 6-5. `src/data/mock/electionResults.json`
legacy fallback 선거 JSON 구조다.

### 6-6. `src/data/elections/seoulElectionResults.json`
중앙선거관리위원회 원본 XLSX에서 생성한 실제 서울시 선거 스냅샷이다.

설계 포인트:
- districtCode / dongCode 기준으로 연결 가능
- 대통령선거는 서울시/자치구/행정동 단위로 포함
- 국회의원선거는 비례대표 결과를 서울시/자치구/행정동 단위로 포함
- 추후 실제 JSON/API URL로 동일 스키마 교체 가능

---

## 7. GeoJSON 구조

### 7-1. `src/data/geo/seoulDistricts.geojson`
자치구 경계.

### 7-2. `src/data/geo/seoulDongs.geojson`
행정동 경계.

### 7-3. simplified 파일
- `src/data/geo/seoulDistricts.simplified.geojson`
- `src/data/geo/seoulDongs.simplified.geojson`

큰 경계 파일을 바로 렌더링하면 느려질 수 있으므로 simplified 버전을 우선 사용하는 구조로 설계했다.

---

## 8. 실제 서울 열린데이터광장 API 키 넣는 방법

`.env.example`을 복사해서 `.env`를 만든다.

```bash
cp .env.example .env
```

예시:
```env
VITE_DATA_SOURCE_MODE=auto
VITE_SEOUL_OPEN_API_KEY=YOUR_SEOUL_OPEN_API_KEY
VITE_SEOUL_OPEN_API_BASE_URL=http://openapi.seoul.go.kr:8088
VITE_SEOUL_POPULATION_BASE_DATE=2025
VITE_SEOUL_DISTRICT_POPULATION_SERVICE=octastatapi10719
VITE_SEOUL_DISTRICT_HOUSEHOLD_SERVICE=octastatapi10930
VITE_SEOUL_DONG_POPULATION_SERVICE=octastatapi10738
VITE_SEOUL_DONG_HOUSEHOLD_SERVICE=octastatapi10592
VITE_ELECTION_RESULTS_URL=
```

개발용 `.env` 예시:
```env
VITE_DATA_SOURCE_MODE=auto
VITE_SEOUL_OPEN_API_KEY=5762776b6d67756e35396d486c4e68
VITE_SEOUL_OPEN_API_BASE_URL=http://openapi.seoul.go.kr:8088
VITE_SEOUL_POPULATION_BASE_DATE=2025
VITE_SEOUL_DISTRICT_POPULATION_SERVICE=octastatapi10719
VITE_SEOUL_DISTRICT_HOUSEHOLD_SERVICE=octastatapi10930
VITE_SEOUL_DONG_POPULATION_SERVICE=octastatapi10738
VITE_SEOUL_DONG_HOUSEHOLD_SERVICE=octastatapi10592
```

필수:
- `VITE_SEOUL_OPEN_API_KEY`

기본 연결값:
- `VITE_SEOUL_OPEN_API_BASE_URL=http://openapi.seoul.go.kr:8088`
- `VITE_SEOUL_DISTRICT_POPULATION_SERVICE=octastatapi10719`
- `VITE_SEOUL_DISTRICT_HOUSEHOLD_SERVICE=octastatapi10930`
- `VITE_SEOUL_DONG_POPULATION_SERVICE=octastatapi10738`
- `VITE_SEOUL_DONG_HOUSEHOLD_SERVICE=octastatapi10592`

설명:
- 자치구 인구는 `서울시 주민등록인구(내국인 각 세별/구별)(2014년 이후) 통계`를 사용한다.
- 자치구 세대수는 `서울시 세대원수별 세대수 통계(구별)`를 사용한다.
- 행정동 인구는 `서울시 주민등록연앙인구(연령별) 통계(동별)`를 사용한다.
- 행정동 세대수는 `서울시 세대원수별 세대수 통계(동별)`를 사용한다.
- `VITE_SEOUL_POPULATION_BASE_DATE`는 `gigan` 파라미터에 해당한다.
- 서울 열린데이터광장 Open API는 `http://openapi.seoul.go.kr:8088` 예시를 공식 문서에 제공한다. 로컬 개발에서는 이 값을 그대로 쓸 수 있다.
- HTTPS 배포 환경에서는 브라우저 혼합 콘텐츠 제한이 걸릴 수 있으므로, 프록시 URL을 별도로 두고 `VITE_SEOUL_OPEN_API_BASE_URL`을 그 주소로 바꾸는 편이 안전하다.

---

## 9. 서울 열린데이터광장 API 연결 방식

### 핵심 파일
- `src/services/fetchDistrictList.ts`
- `src/services/fetchDongList.ts`
- `src/services/fetchSeoulOpenApi.ts`
- `src/services/fetchDistrictPopulation.ts`
- `src/services/fetchDongPopulation.ts`
- `src/services/fetchGeoBoundary.ts`
- `src/services/elections/fetchElectionResults.ts`

### 동작 순서
1. `src/config/dataSource.ts`에서 현재 모드 확인
2. `auto` 또는 `real`이면 실제 API 시도
3. `VITE_SEOUL_OPEN_API_KEY`가 없으면 fallback snapshot 사용
4. 자치구 인구/세대수 API를 각각 호출해 병합
5. 행정동 인구/세대수 API를 각각 호출해 병합
6. 경계와 목록은 실제 스냅샷 GeoJSON/JSON을 기본 사용
7. 선거 결과는 실제 선거 JSON 스냅샷을 기본 사용하고, `VITE_ELECTION_RESULTS_URL`이 있으면 외부 JSON을 우선 사용
8. API 호출 실패 시 fallback snapshot 사용
9. normalize 후 내부 타입으로 반환

현재 번들된 실제 선거 스냅샷에는 아래 선거가 포함되어 있다.
- 제21대 대통령선거 `2025-06-03`
- 제22대 국회의원선거 지역구 `2024-04-10`
- 제22대 국회의원선거 비례대표 `2024-04-10`
- 제20대 대통령선거 `2022-03-09`
- 제8회 전국동시지방선거 서울시장 `2022-06-01`
- 제8회 전국동시지방선거 구청장 `2022-06-01`
- 제8회 전국동시지방선거 서울시교육감 `2022-06-01`
- 제8회 전국동시지방선거 서울시의원 `2022-06-01`
- 제8회 전국동시지방선거 구의원 `2022-06-01`
- 제8회 전국동시지방선거 서울시의원 비례대표 `2022-06-01`
- 제8회 전국동시지방선거 구의원 비례대표 `2022-06-01`

### 내부 공통 타입
- `DistrictPopulationStats`
- `DongPopulationStats`
- `ApiMetaInfo`

### pagination
서울 Open API는 한 번에 최대 1000건 제한이 있으므로, `fetchSeoulOpenApi.ts`에서 1000건 page size를 기본값으로 처리한다.

### 기준월/기준일자 옵션
`fetchDistrictPopulation.ts`, `fetchDongPopulation.ts`는 `baseDate` 옵션을 받을 수 있게 만들어 두었다.

예시:
```ts
await fetchDistrictPopulation({ baseDate: '2025' });
await fetchDongPopulation({ baseDate: '2025' });
```

주의:
- 현재 기본 서비스는 모두 `gigan` 파라미터를 받는다.
- 앱은 `gigan`에 `VITE_SEOUL_POPULATION_BASE_DATE` 또는 `baseDate` 값을 넣는다.
- 실제 서비스가 바뀌면 `src/services/fetchDistrictPopulation.ts`, `src/services/fetchDongPopulation.ts`의 parser를 같이 조정해야 한다.

---

## 10. 실제 API 연결이 실패할 때 fallback snapshot으로 복구되는 방식

현재 모드는 `src/config/dataSource.ts`에서 관리한다.

지원 모드:
- `mock`
- `real`
- `auto`

기본값:
- `auto`

`auto` 모드에서의 fallback:
1. real API 호출
2. 실패
3. `src/data/mock/*`의 공식 스냅샷 반환
4. UI badge에 `fallback` 표시
5. badge hover 시 fallback 이유 또는 실제 호출 endpoint 확인 가능

예시 badge:
- `인구: real`
- `선거: snapshot`
- `경계: snapshot fallback`

이 구조 덕분에:
- API 키가 없어도 앱이 안 깨진다.
- 서비스명이 틀려도 전체 앱이 죽지 않는다.
- 경계 파일 URL이 잘못돼도 공식 스냅샷 GeoJSON으로 내려올 수 있다.
- 서울 Open API가 `ERROR-500`, `INFO-100`, `ERROR-310` 등을 반환해도 홈과 지도 화면은 유지된다.

---

## 11. GeoJSON 파일 교체 방법

교체 대상:
- `src/data/geo/seoulDistricts.geojson`
- `src/data/geo/seoulDongs.geojson`

또는 `.env`로 외부 URL 지정:
- `VITE_DISTRICT_GEO_URL`
- `VITE_DONG_GEO_URL`
- `VITE_DISTRICT_GEO_SIMPLIFIED_URL`
- `VITE_DONG_GEO_SIMPLIFIED_URL`

권장 규칙:
- 자치구는 `districtCode`, `districtName`
- 행정동은 `dongCode`, `dongName`, `districtCode`

실제 원본 속성명이 달라도 괜찮다.  
`src/utils/normalizeBoundaryProperties.ts`가 후보 필드명을 읽어서 내부 표준 구조로 바꾼다.

면적 표시 방식:
1. GeoJSON 속성에 `areaKm2` 또는 GIS 면적 필드가 있으면 그 값을 사용
2. 없으면 `src/utils/calculateArea.ts`가 geometry를 기준으로 km²를 계산
3. 둘 다 실패하면 `데이터 없음`

---

## 12. SHP를 GeoJSON으로 변환하는 방법

### 1. SHP → GeoJSON
```bash
npm run geo:convert-shp -- --input ./raw/file.shp --output ./src/data/geo/output.geojson
```

필요 패키지:
```bash
npm install -D shapefile
```

### 2. 속성명 정규화
```bash
npm run geo:normalize -- --input ./src/data/geo/output.geojson --output ./src/data/geo/output.normalized.geojson --level district
```

### 3. 서울시만 필터링
```bash
npm run geo:filter-seoul -- --input ./raw/national.geojson --output ./src/data/geo/seoulDistricts.geojson --level district --prefix 11
```

---

## 13. 코드 매핑이 왜 중요한가

지도 서비스에서 가장 흔한 오류는 다음 둘이다.

1. 경계 코드와 통계 코드가 다름
2. 자치구/행정동 코드 자릿수가 다름

예:
- 자치구는 5자리
- 행정동은 10자리 표준코드를 우선 사용

이 프로젝트는 아래 유틸로 이 문제를 분리했다.
- `src/utils/normalizeRegionCode.ts`
- `src/utils/normalizeBoundaryProperties.ts`
- `src/utils/joinPopulationToGeo.ts`
- `src/utils/joinElectionToGeo.ts`
- `src/utils/calculateArea.ts`
- `src/utils/electionMatchers.ts`
- `src/utils/regionMatchers.ts`
- `src/utils/validateGeoJoin.ts`
- `src/utils/validateElectionJoin.ts`

핵심 원칙:
- 모든 join은 이름이 아니라 코드 기준
- 코드가 다르면 UI가 아니라 유틸에서 먼저 정규화
- join 실패 수와 누락 코드는 개발자 콘솔에 출력
- 선거 결과는 코드 매핑을 우선하고, 이름 매칭은 보조 수단으로만 사용

추가 인구 지표 계산식:
- `2030 비율 = (20~29세 + 30~39세) / 총인구`
- `10~19세 비율 = 10~19세 인구 / 총인구`
- `65세 이상 비율 = 65세 이상 인구 / 총인구`
- `65세 이상`은 10세 단위 자료일 때 `60~69세` 구간의 절반과 `70세 이상` 구간을 합산해 계산

세대원수별 세대수 연결 방식:
- 공식 스냅샷 JSON의 `householdComposition` 필드 사용
- live API 응답에 세대구성이 없으면 snapshot 값을 보조 지표로 병합

---

## 14. 자주 발생하는 오류와 해결 방법

### 14-1. 지도는 뜨는데 색상이 비어 있음
원인:
- 경계 코드와 통계 코드가 다름

확인:
- `districtCode`, `dongCode`가 같은지 확인

### 14-2. 실제 API를 켰는데 여전히 fallback만 보임
원인:
- API 키가 비어 있음
- `VITE_SEOUL_POPULATION_BASE_DATE`가 실제 제공 연도와 다름
- 서울 Open API가 `ERROR-500`, `INFO-100`, `ERROR-310`을 반환함
- HTTPS 페이지에서 `http://openapi.seoul.go.kr:8088`를 직접 호출해서 혼합 콘텐츠가 차단됨
- API 응답 형식이 parser 예상과 다름

해결:
- `.env` 확인
- 브라우저에서 source badge tooltip으로 fallback 이유 확인
- 배포 환경이면 프록시를 두고 `VITE_SEOUL_OPEN_API_BASE_URL`을 프록시 주소로 변경
- `src/services/fetchDistrictPopulation.ts`
- `src/services/fetchDongPopulation.ts`
- `src/services/elections/fetchElectionResults.ts`

### 14-3. 강서구 동 개수가 4개처럼 적게 보임
원인:
- 일부 예시용 목록만 읽고 실제 행정동 전체 목록/경계를 읽지 않았음
- 행정동 코드가 8자리/10자리로 서로 달라 join이 실패함

해결:
- `src/services/fetchDongList.ts`가 실제 행정동 목록을 읽는지 확인
- `src/utils/normalizeRegionCode.ts`에서 10자리 동 코드 정규화가 적용되는지 확인
- 콘솔의 `[validateGeoJoin] 강서구 행정동` 로그에서 `20/20 matched` 여부 확인
- 콘솔의 `[validateElectionJoin] 강서구 행정동 선거` 로그에서 선거 결과 매핑 개수 확인

### 14-4. `/district/...` 새로고침 시 404
원인:
- 정적 호스팅의 SPA fallback 미설정

해결:
- Vercel rewrite
- Netlify `_redirects`
- Cloudflare Pages SPA fallback 설정

### 14-5. 경계 파일을 바꿨더니 상세 페이지가 비어 있음
원인:
- GeoJSON 속성명이 표준 필드와 다름

해결:
- `scripts/normalize-boundary-properties.ts` 실행
- `src/utils/regionMatchers.ts` 보강

### 14-6. 행정동 상세 차트가 비어 있음
원인:
- real API 응답에는 연령대 데이터가 아직 없을 수 있음

해결:
- fallback UI는 정상
- 별도 연령대 API 또는 사전 가공 JSON을 추가하면 된다

### 14-7. 면적이 데이터 없음으로 보임
원인:
- 경계 geometry가 누락됐거나 GeoJSON 파싱이 실패함
- 명시적 면적 필드와 geometry 계산이 모두 실패함

해결:
- `src/data/geo/*.geojson`에 Polygon/MultiPolygon geometry가 있는지 확인
- 브라우저 콘솔에서 area source와 boundary fallback 메시지 확인
- 필요하면 GeoJSON 속성에 `areaKm2`를 직접 넣어 우선 사용

### 14-8. 일부 행정동 선거결과가 비어 있음
원인:
- 선거 원본 기준연도(2024, 2025)의 행정동 체계와 현재 경계 기준연도(2026)가 다름
- 예: 분동/통합 전후의 동명이 달라 one-to-one 코드 매핑이 불가능한 경우가 있음
- 국회의원선거 지역구처럼 `중구성동구갑`처럼 여러 자치구가 하나의 선거구명으로 묶인 경우가 있어, 구 단위 집계는 동 결과를 다시 합산해야 정확해짐
- 2022 지방선거의 구의원/기초비례는 일부 동이 당시 선거구 체계상 직접 분리되지 않아, 현재 2026 행정동 기준으로는 coverage가 더 낮을 수 있음

해결:
- 콘솔의 `[validateElectionJoin]` 로그에서 누락 지역을 확인
- 완전한 매핑이 필요하면 선거 기준연도의 행정동 경계 또는 별도 alias 매핑표를 추가
- 현재 앱은 이런 경우 임의 복제 없이 `데이터 없음`으로 처리

---

## 15. 서울시 25개 자치구 / 행정동 데이터 확장 방법

### 자치구 확장
1. `src/data/geo/seoulDistricts.geojson`을 최신 경계로 교체
2. `src/data/mock/seoulDistricts.json` fallback snapshot을 최신 기준으로 재생성
3. `src/data/mock/districtPopulation.json` fallback snapshot을 최신 기준으로 재생성
4. `src/utils/validateGeoJoin.ts` 로그로 25개 구가 모두 매칭되는지 확인

### 행정동 확장
1. `src/data/geo/seoulDongs.geojson`을 최신 행정동 경계로 교체
2. `src/data/mock/seoulDongs.json` fallback snapshot을 최신 기준으로 재생성
3. `src/data/mock/dongPopulation.json` fallback snapshot을 최신 기준으로 재생성
4. 강서구/마포구/송파구 검증 로그에서 동 개수와 population이 정상인지 확인

현재 fallback snapshot에는 서울시 행정동 427개 전체가 들어 있다.  
최신 원본 파일로 교체할 때도 같은 구조를 그대로 쓰면 된다.

---

## 16. 향후 선거데이터, 생활인구, 시설데이터 붙이는 방법

### 선거 데이터
- 현재 기본 소스는 `src/data/elections/seoulElectionResults.json`
- 외부 실제 JSON을 쓸 때는 `VITE_ELECTION_RESULTS_URL`로 교체
- 선관위 원본 XLSX를 다시 가공할 때는 `npx tsx scripts/prepare-election-data.ts`
- 원본 입력 예시:
  - `raw/presidential_21.xlsx`
  - `raw/presidential_20.csv`
  - `raw/assembly_22.xlsx`
  - `raw/local_8.xlsx`
- 현재 스크립트는 `2025 대선`, `2024 총선 지역구`, `2024 총선 비례대표`, `2022 대선`, `2022 지방선거(서울시장·구청장·서울시교육감·서울시의원·구의원·광역비례·기초비례)`까지 생성한다
- 필요 시 `electionType`, `resultMode`, `scopeLevel` 조합만 늘리면 된다

### 생활인구 데이터
- 새 서비스 파일 예시:
  - `src/services/fetchLivingPopulation.ts`
- 새 타입 예시:
  - `DistrictLivingPopulationStats`
  - `DongLivingPopulationStats`

### 시설 데이터
- 학교, 병원, 공원, 복지시설 등을 별도 JSON/API로 추가
- 코드 기반이 아니라 좌표 기반일 수 있으므로 marker layer 추가 권장

### 민원 데이터
- 자치구별 월간 민원 건수
- 행정동별 민원 유형 통계
- 기존 탭의 `기타` 섹션에 붙이기 적합

---

## 17. 배포 방법

### Vercel
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- SPA rewrite 필요

예시 `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Netlify
- Build command: `npm run build`
- Publish directory: `dist`

`public/_redirects` 예시:
```text
/* /index.html 200
```

### Cloudflare Pages
- Build command: `npm run build`
- Output directory: `dist`
- SPA fallback 설정 필요

---

## 18. 참고 메모

서울 열린데이터광장 Open API URL은 일반적으로 아래 형식을 사용한다.

```text
https://openapi.seoul.go.kr:8088/{API_KEY}/json/{SERVICE_NAME}/{START}/{END}/...
```

실제 서비스명과 path parameter는 데이터셋 문서를 확인해서 넣어야 한다.

공식 참고:
- 서울 열린데이터광장: https://data.seoul.go.kr/
- 서울 Open API 사용 예시 안내: https://data.seoul.go.kr/together/togetherOpenapi.do
- 공공데이터포털: https://www.data.go.kr/
- 중앙선거관리위원회 선거통계시스템: https://info.nec.go.kr/

데이터는 갱신 시점에 따라 달라질 수 있다.
