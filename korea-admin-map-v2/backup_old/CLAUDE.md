# Korea Admin Map v2 Context

## Goal
대한민국 전국 행정구역을 `adminCode` 기준으로 탐색하면서 경계, 인구, 선거 데이터를 하나의 앱 구조에서 확인하는 데이터맵 플랫폼이다.

## Core Principles
- `real -> snapshot -> mock` 우선순위를 기본으로 사용한다.
- geometry는 가짜 사각형이나 placeholder를 만들지 않는다.
- 경계, 인구, 선거는 각자 독립 서비스와 normalizer를 갖는다.
- 화면은 전국 → 시도 → 시군구 → 읍면동 drill-down을 기준으로 설계한다.
- API 키는 코드에 넣지 않고 `.env.local`에서만 읽는다.

## Main Folders
- `src/types`: adminCode, boundary, population, election, thematic, search, comparison 타입
- `src/services/api`: SGIS, MOIS, NEC real API 호출
- `src/services`: 화면에서 쓰는 boundary/population/election/search/comparison/thematic 서비스
- `src/data/admin`: 전국 행정 master
- `src/data/snapshot`: real 실패 시 fallback에 쓰는 정적 데이터
- `src/data/mock`: 초기 화면 보장용 최소 mock seed
- `src/pages`: main, detail, compare, sources

## Current Runtime Behavior
- 전국 시도 경계: SGIS real 우선, 실패 시 province snapshot
- 시군구 경계: SGIS real 우선, 실패 시 서울 snapshot
- 읍면동 경계: SGIS real 우선, 실패 시 강서구 snapshot
- 인구: MOIS real 우선, 실패 시 snapshot, 마지막으로 mock
- 선거: NEC real 시도 후 fallback, 기본은 snapshot/mock 혼합

## Notes
- MOIS와 NEC는 브라우저에서 직접 쓰기 어렵기 때문에 dev 환경에서는 Vite proxy를 사용한다.
- static deploy에서는 reverse proxy 또는 edge function이 있으면 real 모드가 더 안정적이다.
