import { EmptyPanel } from '@/components/common/StatePanel'
import { BoundaryLayer } from '@/components/map/BoundaryLayer'
import { FitBoundsToData } from '@/components/map/FitBoundsToData'
import { LeafletMap } from '@/components/map/LeafletMap'
import type { BoundaryFeatureCollection } from '@/types/admin'

interface AdminMapProps {
  data: BoundaryFeatureCollection | null
  selectedCode?: string
  metricLookup?: Record<string, number | undefined>
  fillColorLookup?: Record<string, string | undefined>
  tooltipLookup?: Record<string, string | undefined>
  noDataFillColor?: string
  onFeatureClick?: (code: string) => void
  height?: number
  emptyMessage?: string
  debugLabel?: string
}

export function AdminMap({
  data,
  selectedCode,
  metricLookup,
  fillColorLookup,
  tooltipLookup,
  noDataFillColor,
  onFeatureClick,
  height = 560,
  emptyMessage = '표시할 경계 데이터가 없습니다.',
  debugLabel,
}: AdminMapProps) {
  if (!data || data.features.length === 0) {
    return <EmptyPanel className="map-empty" message={emptyMessage} />
  }

  const initialZoom =
    data.metadata?.adminLevel === 'province'
      ? 8
      : data.metadata?.adminLevel === 'city'
        ? 10
        : 12

  return (
    <LeafletMap debugLabel={debugLabel} height={height} zoom={initialZoom}>
      <BoundaryLayer
        data={data}
        debugLabel={debugLabel}
        fillColorLookup={fillColorLookup}
        metricLookup={metricLookup}
        noDataFillColor={noDataFillColor}
        onFeatureClick={onFeatureClick}
        selectedCode={selectedCode}
        tooltipLookup={tooltipLookup}
      />
      <FitBoundsToData data={data} />
    </LeafletMap>
  )
}
