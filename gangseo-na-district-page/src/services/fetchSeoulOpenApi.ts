import { SEOUL_OPEN_API_BASE_URL, SEOUL_OPEN_API_PAGE_SIZE, getSeoulOpenApiKey } from '../config/dataSource';
import type { ApiMetaInfo } from '../types';

interface FetchSeoulOpenApiOptions {
  serviceName: string;
  dataLabel: string;
  pathSegments?: string[];
  pageSize?: number;
}

interface SeoulApiEnvelope<Row> {
  list_total_count?: number;
  RESULT?: {
    CODE?: string;
    MESSAGE?: string;
  };
  row?: Row[];
}

export interface SeoulOpenApiResult<Row> {
  rows: Row[];
  meta: ApiMetaInfo;
}

export async function fetchSeoulOpenApiRows<Row>({
  serviceName,
  dataLabel,
  pathSegments = [],
  pageSize = SEOUL_OPEN_API_PAGE_SIZE,
}: FetchSeoulOpenApiOptions): Promise<SeoulOpenApiResult<Row>> {
  const apiKey = getSeoulOpenApiKey();
  if (!apiKey) {
    throw new Error('서울 열린데이터광장 API 키가 설정되지 않았습니다.');
  }

  if (!serviceName) {
    throw new Error(`${dataLabel}용 서비스명이 설정되지 않았습니다.`);
  }

  const requestedAt = new Date().toISOString();
  const rows: Row[] = [];
  let startIndex = 1;
  let totalCount = Number.POSITIVE_INFINITY;
  let firstEndpoint = '';

  while (startIndex <= totalCount) {
    const endIndex = startIndex + pageSize - 1;
    const endpoint = buildSeoulOpenApiUrl(apiKey, serviceName, startIndex, endIndex, pathSegments);
    if (!firstEndpoint) {
      firstEndpoint = endpoint;
    }

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`${dataLabel} 요청 실패: ${response.status}`);
    }

    const json = (await response.json()) as Record<string, SeoulApiEnvelope<Row>>;
    const topLevelResult = (json as unknown as { RESULT?: { CODE?: string; MESSAGE?: string } }).RESULT;
    if (topLevelResult?.CODE && topLevelResult.CODE !== 'INFO-000') {
      throw new Error(`${dataLabel} 응답 오류: ${topLevelResult.MESSAGE ?? topLevelResult.CODE}`);
    }

    const envelope = json[serviceName];
    if (!envelope) {
      throw new Error(`${dataLabel} 응답에서 ${serviceName} 키를 찾지 못했습니다.`);
    }

    const resultCode = envelope.RESULT?.CODE;
    if (resultCode && resultCode !== 'INFO-000') {
      throw new Error(`${dataLabel} 응답 오류: ${envelope.RESULT?.MESSAGE ?? resultCode}`);
    }

    totalCount = envelope.list_total_count ?? envelope.row?.length ?? 0;
    const batch = envelope.row ?? [];
    rows.push(...batch);

    if (!batch.length) {
      break;
    }

    startIndex += pageSize;
  }

  return {
    rows,
    meta: {
      requestedAt,
      sourceLabel: `서울 열린데이터광장 Open API (${serviceName})`,
      resolvedSource: 'real',
      fallbackUsed: false,
      endpoint: firstEndpoint,
    },
  };
}

export function createMockMeta(sourceLabel: string, dataUpdatedAt?: string, fallbackReason?: string): ApiMetaInfo {
  return {
    requestedAt: new Date().toISOString(),
    dataUpdatedAt,
    sourceLabel,
    resolvedSource: 'mock',
    fallbackUsed: Boolean(fallbackReason),
    fallbackReason,
  };
}

export function createRealFallbackMeta(
  realSourceLabel: string,
  dataUpdatedAt: string | undefined,
  fallbackReason: string,
): ApiMetaInfo {
  return {
    requestedAt: new Date().toISOString(),
    dataUpdatedAt,
    sourceLabel: realSourceLabel,
    resolvedSource: 'mock',
    fallbackUsed: true,
    fallbackReason,
  };
}

function buildSeoulOpenApiUrl(
  apiKey: string,
  serviceName: string,
  startIndex: number,
  endIndex: number,
  pathSegments: string[],
): string {
  const segments = [SEOUL_OPEN_API_BASE_URL, apiKey, 'json', serviceName, `${startIndex}`, `${endIndex}`, ...pathSegments.map(encodeURIComponent)];
  return segments.join('/');
}
