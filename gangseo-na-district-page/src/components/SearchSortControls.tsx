import type { DistrictSortKey, MapMetricKey } from '../types';

interface SearchSortControlsProps {
  search: string;
  sortKey: DistrictSortKey;
  metricKey?: MapMetricKey;
  searchLabel?: string;
  onSearchChange: (value: string) => void;
  onSortChange: (value: DistrictSortKey) => void;
  onMetricChange?: (value: MapMetricKey) => void;
}

export function SearchSortControls({
  search,
  sortKey,
  metricKey,
  searchLabel = '자치구 검색',
  onSearchChange,
  onSortChange,
  onMetricChange,
}: SearchSortControlsProps) {
  return (
    <div className="filter-grid">
      <label className="field">
        <span>{searchLabel}</span>
        <input
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="예: 마포구"
          type="search"
          value={search}
        />
      </label>

      <label className="field">
        <span>정렬</span>
        <select onChange={(event) => onSortChange(event.target.value as DistrictSortKey)} value={sortKey}>
          <option value="name">가나다순</option>
          <option value="population">인구순</option>
        </select>
      </label>

      {onMetricChange ? (
        <label className="field">
          <span>지도 지표</span>
          <select onChange={(event) => onMetricChange(event.target.value as MapMetricKey)} value={metricKey}>
            <option value="population">총인구</option>
            <option value="households">세대수</option>
            <option value="turnout">투표율</option>
          </select>
        </label>
      ) : null}
    </div>
  );
}
