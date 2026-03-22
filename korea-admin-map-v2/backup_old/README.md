# korea-admin-map-v2

전국 행정구역을 `adminCode` 기준으로 탐색하면서 경계, 인구, 선거 데이터를 확인하고 비교하는 React + Vite + TypeScript 데이터맵 앱입니다.

## 현재 구현 범위
- 전국 시도 지도
- 시도 클릭 → 시군구 drill-down
- 시군구 클릭 → 읍면동 drill-down
- 지역별 인구 패널
- 지역별 선거 요약 패널
- 비교 페이지
- 검색 자동완성
- 테마맵 지표 선택
- Sources 페이지

## 데이터 소스 구조
- `real`: 실제 API 호출
- `snapshot`: 정적 fallback
- `mock`: 마지막 안전장치

기본 우선순위는 `real -> snapshot -> mock` 입니다.

## 환경변수 설정
1. 프로젝트 루트에 `.env.local` 파일을 둡니다.
2. `.env.example` 형식을 참고해 값을 채웁니다.
3. 개발 서버를 다시 시작합니다.

필수 변수:

| 이름 | 설명 |
| --- | --- |
| `VITE_DATA_MODE` | `real`, `snapshot`, `mock` |
| `VITE_SGIS_SERVICE_ID` | SGIS 서비스 ID |
| `VITE_SGIS_SECURITY_KEY` | SGIS 보안 키 |
| `VITE_SGIS_API_BASE_URL` | SGIS base URL 또는 dev proxy 경로 |
| `VITE_SGIS_AUTH_PATH` | SGIS auth path |
| `VITE_SGIS_BOUNDARY_PATH` | SGIS boundary path |
| `VITE_MOIS_API_KEY` | 행안부 인구 API 키 |
| `VITE_MOIS_API_BASE_URL` | MOIS base URL 또는 dev proxy 경로 |
| `VITE_MOIS_API_PATH` | MOIS path prefix |
| `VITE_NEC_API_KEY` | 중앙선관위 API 키 |
| `VITE_NEC_API_BASE_URL` | NEC base URL 또는 dev proxy 경로 |
| `VITE_NEC_API_PATH` | NEC API path |

## 실행
```bash
npm install
npm run dev
```

빌드:
```bash
npm run build
```

lint:
```bash
npm run lint
```

## 페이지 설명
- `/` : 앱 소개
- `/map` : 전국 시도 테마맵
- `/province/:provinceCode` : 시도 상세
- `/province/:provinceCode/city/:cityCode` : 시군구 상세
- `/province/:provinceCode/city/:cityCode/town/:townCode` : 읍면동 상세
- `/compare` : 두 지역 비교
- `/sources` : boundary / population / election 소스 상태 확인

## Sources 페이지 읽는 방법
- `current sourceType`: 현재 실제 사용 중인 소스
- `status code`: 마지막 요청 응답 코드
- `fallback reason`: real 실패 시 snapshot/mock으로 내려간 이유
- `request url`: 마지막 실제 호출 주소

## 실데이터 연결 방식
- `SGIS`: 전국 경계 polygon
- `MOIS`: 인구, 세대수, 남녀 인구
- `NEC`: 선거 결과

개발 환경에서는 Vite proxy를 사용합니다.

## snapshot fallback
- `src/data/snapshot/province.json`
- `src/data/snapshot/seoul-cities.json`
- `src/data/snapshot/gangseo-towns.json`
- `src/data/snapshot/population.sample.json`
- `src/data/snapshot/elections.sample.json`

## 향후 확장 방향
- 전국 시군구/읍면동 snapshot 보강
- NEC 승인 완료 후 선거 real 전환
- MOIS 연령별 상세 통계 별도 연결
- 서울 외 대도시 실데이터 검증 확대
