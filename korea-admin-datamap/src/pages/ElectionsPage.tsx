import { useMemo, useState } from 'react'
import { ElectionResultChart } from '@/components/ElectionResultChart'
import { ElectionSummaryCard } from '@/components/ElectionSummaryCard'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '@/components/common/StatePanel'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  getElectionResults,
  listAvailableElections,
} from '@/services/electionDataService'
import { listProvinces } from '@/services/adminDataService'
import { createCodeLookup } from '@/utils/adminCodes'
import { formatPercent } from '@/utils/formatters'
import type { ElectionResult } from '@/types/election'

const getTopResultsByAdminCode = (results: ElectionResult[]) =>
  Object.values(
    results.reduce<Record<string, ElectionResult>>((lookup, result) => {
      const current = lookup[result.adminCode]
      if (!current || current.voteRate < result.voteRate) {
        lookup[result.adminCode] = result
      }
      return lookup
    }, {}),
  ).sort((left, right) => left.adminCode.localeCompare(right.adminCode))

export function ElectionsPage() {
  const provincesState = useAsyncData(() => listProvinces(), [])
  const electionDefinitionsState = useAsyncData(() => listAvailableElections(), [])
  const [selectedElectionId, setSelectedElectionId] = useState<string>('')
  const resolvedElectionId =
    selectedElectionId || electionDefinitionsState.data?.[0]?.electionId || ''
  const electionsState = useAsyncData(
    () =>
      resolvedElectionId
        ? getElectionResults('province', resolvedElectionId)
        : Promise.resolve([]),
    [resolvedElectionId],
  )

  const provinceNames = createCodeLookup(
    provincesState.data ?? [],
    (province) => province.name,
  )
  const pageError =
    provincesState.error ?? electionDefinitionsState.error ?? electionsState.error
  const topProvinceResults = useMemo(
    () => getTopResultsByAdminCode(electionsState.data ?? []),
    [electionsState.data],
  )
  const chartResults = useMemo(() => {
    const firstProvinceCode = topProvinceResults[0]?.adminCode
    if (!firstProvinceCode) {
      return []
    }

    return (electionsState.data ?? []).filter(
      (result) => result.adminCode === firstProvinceCode,
    )
  }, [electionsState.data, topProvinceResults])

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">선거 데이터 계층</span>
          <h1>ElectionResult 계층</h1>
        </div>
        <p>
          선거 데이터는 snapshot과 real API를 분리한 채 admin code 기준으로 정규화됩니다.
          현재 화면은 snapshot 우선 구조를 기준으로 동작합니다.
        </p>
      </div>

      {pageError ? (
        <ErrorPanel message={pageError} />
      ) : electionDefinitionsState.loading && !electionDefinitionsState.data ? (
        <LoadingPanel message="선거 데이터를 불러오는 중입니다." />
      ) : !(electionDefinitionsState.data ?? []).length ? (
        <EmptyPanel message="표시할 선거 정의가 없습니다." />
      ) : (
        <div className="stack">
          <article className="panel">
            <div className="panel-head">
              <span className="eyebrow">선거 선택</span>
              <h2>snapshot / real API 전환 준비</h2>
            </div>
            <div className="control-row">
              <label className="select-field">
                <span>선거</span>
                <select
                  aria-label="선거 선택"
                  className="select-input"
                  value={resolvedElectionId}
                  onChange={(event) => setSelectedElectionId(event.target.value)}
                >
                  {(electionDefinitionsState.data ?? []).map((definition) => (
                    <option key={definition.electionId} value={definition.electionId}>
                      {definition.electionName} ({definition.electionDate})
                    </option>
                  ))}
                </select>
              </label>
              <p className="helper-text">
                지역명 기반 응답이 들어와도 admin code 기준으로 정규화 후 join 검증을
                수행합니다.
              </p>
            </div>
          </article>

          {electionsState.loading && !electionsState.data ? (
            <LoadingPanel message="선거 결과를 불러오는 중입니다." />
          ) : (
            <>
              <div className="card-grid">
                {topProvinceResults.map((result) => (
                  <ElectionSummaryCard
                    key={`${result.electionId}:${result.adminCode}`}
                    title={provinceNames[result.adminCode] ?? result.regionName}
                    result={result}
                  />
                ))}
              </div>

              {chartResults.length > 0 ? (
                <ElectionResultChart results={chartResults} />
              ) : null}

              <article className="panel">
                <div className="panel-head">
                  <span className="eyebrow">현재 선택</span>
                  <h2>주요 요약</h2>
                </div>
                <ul className="simple-list">
                  {topProvinceResults.map((result) => (
                    <li key={`${result.electionId}:${result.adminCode}:summary`}>
                      {provinceNames[result.adminCode] ?? result.regionName}: {result.partyName}{' '}
                      {formatPercent(result.voteRate)}
                    </li>
                  ))}
                </ul>
              </article>
            </>
          )}
        </div>
      )}
    </section>
  )
}
