import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import type { PopulationStats } from '@/types/population'
import type { Province } from '@/types/admin'
import { formatPopulation } from '@/utils/formatters'

interface ProvinceSidebarProps {
  provinces: Province[]
  populationStats: PopulationStats[]
  selectedCode?: string
}

export function ProvinceSidebar({
  provinces,
  populationStats,
  selectedCode,
}: ProvinceSidebarProps) {
  const populationLookup = Object.fromEntries(
    populationStats.map((record) => [record.adminCode, record.totalPopulation]),
  )

  return (
    <aside className="panel side-list">
      <div className="panel-head">
        <span className="eyebrow">전국 시도</span>
        <h2>17개 시도 mock 데이터</h2>
      </div>
      <ul className="admin-list">
        {provinces.map((province) => (
          <li key={province.code}>
            <Link
              className={
                province.code === selectedCode
                  ? 'admin-list-link selected'
                  : 'admin-list-link'
              }
              to={ROUTES.province(province.code)}
            >
              <div>
                <strong>{province.shortName}</strong>
                <p>{province.cityCount}개 시군구 구조 준비</p>
              </div>
              <span>{formatPopulation(populationLookup[province.code] ?? 0)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
