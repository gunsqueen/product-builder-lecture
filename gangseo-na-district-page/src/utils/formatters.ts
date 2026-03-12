export function formatNumber(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) {
    return '데이터 없음';
  }

  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

export function formatPopulation(value: number | undefined): string {
  return value === undefined ? '데이터 없음' : `${formatNumber(value)}명`;
}

export function formatHouseholds(value: number | undefined): string {
  return value === undefined ? '데이터 없음' : `${formatNumber(value)}세대`;
}

export function formatPercent(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) {
    return '데이터 없음';
  }

  return `${(value * 100).toFixed(1)}%`;
}

export function formatArea(areaKm2: number | undefined): string {
  if (areaKm2 === undefined || Number.isNaN(areaKm2)) {
    return '데이터 없음';
  }

  return `${areaKm2.toFixed(2)}㎢`;
}
