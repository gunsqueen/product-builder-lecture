import { useEffect, useMemo, useRef } from 'react'
import type { GeoJsonObject } from 'geojson'
import type L from 'leaflet'
import { GeoJSON } from 'react-leaflet'
import { useMap } from 'react-leaflet'
import type {
  BoundaryFeature,
  BoundaryFeatureCollection,
} from '@/types/admin'
import { getChoroplethFillColor } from '@/utils/mapStyles'

interface BoundaryLayerProps {
  data: BoundaryFeatureCollection
  selectedCode?: string
  metricLookup?: Record<string, number | undefined>
  fillColorLookup?: Record<string, string | undefined>
  tooltipLookup?: Record<string, string | undefined>
  noDataFillColor?: string
  onFeatureClick?: (code: string) => void
  debugLabel?: string
}

export function BoundaryLayer({
  data,
  selectedCode,
  metricLookup,
  fillColorLookup,
  tooltipLookup,
  noDataFillColor = '#d6e1e3',
  onFeatureClick,
  debugLabel,
}: BoundaryLayerProps) {
  const map = useMap()
  const geoJsonRef = useRef<L.GeoJSON | null>(null)
  const sortedValues = useMemo(
    () =>
      Object.values(metricLookup ?? {})
        .filter((value): value is number => typeof value === 'number')
        .sort((left, right) => left - right),
    [metricLookup],
  )
  const visibleFeatureCount = useMemo(
    () =>
      data.features.filter(
        (feature) =>
          Boolean(feature.geometry?.type) &&
          Array.isArray((feature.geometry as GeoJsonObject & { coordinates?: unknown }).coordinates),
      ).length,
    [data.features],
  )

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    const layerCount = geoJsonRef.current?.getLayers().length ?? 0
    const sampleFeature = data.features[0]
    const sampleStyle = sampleFeature
      ? {
          color: selectedCode === sampleFeature.properties.adminCode ? '#0f2d32' : '#36545a',
          fillOpacity: selectedCode === sampleFeature.properties.adminCode ? 0.92 : 0.78,
          weight: selectedCode === sampleFeature.properties.adminCode ? 3 : 1.5,
        }
      : null

    console.info(`[map:${debugLabel ?? data.metadata?.adminLevel ?? 'boundary'}] boundary layer`, {
      loadedFeatureCount: data.features.length,
      renderedFeatureCount: layerCount,
      visibleFeatureCount,
      selectedCode,
      sourceType: data.metadata?.sourceType,
      geometrySource: data.metadata?.geometrySource,
      sampleGeometryType: sampleFeature?.geometry?.type,
      sampleStyle,
      mapCenter: map.getCenter(),
      mapZoom: map.getZoom(),
    })
  }, [data, debugLabel, map, selectedCode, visibleFeatureCount])

  return (
    <GeoJSON
      ref={geoJsonRef}
      key={`${selectedCode ?? 'all'}-${data.features.length}`}
      data={data as GeoJsonObject}
      onEachFeature={(feature, layer) => {
        const typedFeature = feature as BoundaryFeature
        const code = typedFeature.properties.adminCode
        const tooltipText = tooltipLookup?.[code] ?? typedFeature.properties.name

        layer.bindTooltip(tooltipText, {
          sticky: true,
        })

        layer.on({
          click: () => onFeatureClick?.(code),
        })
      }}
      style={(feature) => {
        const typedFeature = feature as BoundaryFeature
        const code = typedFeature.properties.adminCode
        const value = metricLookup?.[code]
        const isSelected = selectedCode === code
        const fillColor =
          fillColorLookup?.[code] ??
          getChoroplethFillColor(value, sortedValues) ??
          noDataFillColor

        return {
          color: isSelected ? '#0f2d32' : '#36545a',
          fillColor,
          fillOpacity: isSelected ? 0.92 : 0.78,
          weight: isSelected ? 3 : 1.5,
        }
      }}
    />
  )
}
