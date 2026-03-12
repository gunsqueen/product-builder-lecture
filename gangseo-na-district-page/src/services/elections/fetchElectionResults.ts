import actualElectionResults from '../../data/elections/seoulElectionResults.json';
import legacyFallbackElectionResults from '../../data/mock/electionResults.json';
import { getDataSourceMode } from '../../config/dataSource';
import type { ElectionDataset } from '../../types';
import { createMockMeta, createRealFallbackMeta } from '../fetchSeoulOpenApi';
import { normalizeElectionDataset } from './normalizeElectionResults';

const ELECTION_RESULTS_URL = import.meta.env.VITE_ELECTION_RESULTS_URL?.trim() || '';

export async function fetchElectionResults(): Promise<ElectionDataset> {
  const mode = getDataSourceMode();
  const bundledActual = normalizeElectionDataset(actualElectionResults as unknown as Parameters<typeof normalizeElectionDataset>[0]);
  bundledActual.meta.sourceLabel = '중앙선거관리위원회 선거통계시스템 공식 스냅샷';

  if (mode === 'mock') {
    return {
      ...normalizeElectionDataset(legacyFallbackElectionResults as unknown as Parameters<typeof normalizeElectionDataset>[0]),
      meta: createMockMeta('서울시 선거 결과 fallback mock dataset', `${legacyFallbackElectionResults.updatedAt}`),
    };
  }

  if (!ELECTION_RESULTS_URL) {
    return bundledActual;
  }

  try {
    const response = await fetch(ELECTION_RESULTS_URL);
    if (!response.ok) {
      throw new Error(`선거 결과 JSON 요청 실패: ${response.status}`);
    }

    const json = await response.json();
    const normalized = normalizeElectionDataset(json as Parameters<typeof normalizeElectionDataset>[0]);
    normalized.meta.endpoint = ELECTION_RESULTS_URL;
    normalized.meta.sourceLabel = '외부 실제 선거 결과 JSON';
    return normalized;
  } catch (error) {
    return {
      ...bundledActual,
      meta: createRealFallbackMeta(
        ELECTION_RESULTS_URL,
        bundledActual.meta.dataUpdatedAt,
        error instanceof Error ? error.message : '실제 선거 데이터 로드 실패',
      ),
    };
  }
}
