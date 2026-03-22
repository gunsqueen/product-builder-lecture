import { useEffect, useMemo, useRef, useState } from 'react'
import { GeoJSON, MapContainer, Pane, TileLayer, useMap } from 'react-leaflet'
import type { Path, PathOptions } from 'leaflet'
import L from 'leaflet'
import type { BoundaryCollection, BoundaryFeature } from '../../types/admin'

interface RenderDebugInfo {
  renderedFeatureCount: number
  mapBounds: string
  fitBoundsApplied: boolean
  geoJsonMounted: boolean
  firstFeatureBounds: string
  geometryTypesSummary: string[]
}

const formatBounds = (bounds: L.LatLngBounds) => {
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()
  return `${sw.lat.toFixed(6)}, ${sw.lng.toFixed(6)} / ${ne.lat.toFixed(6)}, ${ne.lng.toFixed(6)}`
}

const FitToFeatures = ({
  data,
  maxZoom,
  onApplied,
}: {
  data: BoundaryCollection
  maxZoom: number
  onApplied?: (payload: { fitBoundsApplied: boolean; mapBounds: string; firstFeatureBounds: string }) => void
}) => {
  const map = useMap()

  useEffect(() => {
    if (data.features.length === 0) {
      onApplied?.({ fitBoundsApplied: false, mapBounds: '-', firstFeatureBounds: '-' })
      return
    }

    const bounds = L.geoJSON(data as never).getBounds()
    if (!bounds.isValid()) {
      onApplied?.({ fitBoundsApplied: false, mapBounds: '-', firstFeatureBounds: '-' })
      return
    }

    map.invalidateSize()
    map.fitBounds(bounds, { padding: [20, 20], maxZoom })
    onApplied?.({
      fitBoundsApplied: true,
      mapBounds: formatBounds(bounds),
      firstFeatureBounds: formatBounds(L.geoJSON(data.features[0] as never).getBounds()),
    })
  }, [data, map, maxZoom, onApplied])

  return null
}

interface BoundaryMapProps {
  data: BoundaryCollection
  onFeatureClick: (feature: BoundaryFeature) => void
  variant: 'province' | 'city' | 'town'
  onDebugInfo?: (info: RenderDebugInfo) => void
  selectedAdminCode?: string
}

export const BoundaryMap = ({ data, onFeatureClick, variant, onDebugInfo, selectedAdminCode }: BoundaryMapProps) => {
  const geoJsonRef = useRef<L.GeoJSON | null>(null)
  const [fitBoundsApplied, setFitBoundsApplied] = useState(false)
  const [mapBounds, setMapBounds] = useState('-')
  const [firstFeatureBounds, setFirstFeatureBounds] = useState('-')
  const geometryTypesSummary = useMemo(
    () => [...new Set(data.features.map((feature) => feature.geometry.type))],
    [data],
  )

  const baseStyle: PathOptions = useMemo(
    () =>
      variant === 'province'
        ? {
            color: '#0f4cff',
            weight: 2,
            opacity: 1,
            fillColor: '#7cc8ff',
            fillOpacity: 0.35,
          }
        : variant === 'city'
          ? {
              color: '#14532d',
              weight: 1.8,
              opacity: 1,
              fillColor: '#86efac',
              fillOpacity: 0.38,
            }
          : {
              color: '#ff0000',
              weight: 2.8,
              opacity: 1,
              fillColor: '#ffd54f',
              fillOpacity: 0.42,
            },
    [variant],
  )

  useEffect(() => {
    const renderedFeatureCount =
      geoJsonRef.current &&
      typeof (geoJsonRef.current as unknown as { getLayers?: () => L.Layer[] }).getLayers === 'function'
        ? ((geoJsonRef.current as unknown as { getLayers: () => L.Layer[] }).getLayers()?.length ?? 0)
        : 0

    const info: RenderDebugInfo = {
      renderedFeatureCount,
      mapBounds,
      fitBoundsApplied,
      geoJsonMounted: Boolean(geoJsonRef.current),
      firstFeatureBounds,
      geometryTypesSummary,
    }

    onDebugInfo?.(info)

    if (import.meta.env.DEV) {
      console.log(`[map:${variant}] boundary layer`, {
        loadedFeatureCount: data.features.length,
        renderedFeatureCount,
        pane: variant === 'town' ? 'town-pane' : 'overlayPane',
        appliedStyleSummary: baseStyle,
        geometryTypesSummary,
      })
    }
  }, [baseStyle, data.features.length, firstFeatureBounds, fitBoundsApplied, geometryTypesSummary, mapBounds, onDebugInfo, variant])

  return (
    <div className="map-shell">
      <MapContainer
        key={`${variant}-${data.features.length}`}
        center={[36.4, 127.8]}
        zoom={7}
        scrollWheelZoom
        className="leaflet-root"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {variant === 'town' ? (
          <Pane name="town-pane" style={{ zIndex: 650 }}>
            <GeoJSON
              ref={(layer) => {
                geoJsonRef.current = layer
              }}
              data={data as never}
              style={() => baseStyle}
              onEachFeature={(feature, layer) => {
                const boundary = feature as BoundaryFeature
                layer.bindTooltip(`${boundary.properties.name} (${boundary.properties.adminCode})`)
                layer.on({
                  mouseover: () => {
                    ;(layer as Path).setStyle({
                      color: '#1d4ed8',
                      weight: 3.8,
                      fillColor: '#fde68a',
                      fillOpacity: 0.55,
                    })
                  },
                  mouseout: () => {
                    ;(layer as Path).setStyle(
                      boundary.properties.adminCode === selectedAdminCode
                        ? {
                            color: '#1d4ed8',
                            weight: 4,
                            opacity: 1,
                            fillColor: '#fde68a',
                            fillOpacity: 0.65,
                          }
                        : baseStyle,
                    )
                  },
                  click: () => onFeatureClick(boundary),
                })

                if (boundary.properties.adminCode === selectedAdminCode) {
                  ;(layer as Path).setStyle({
                    color: '#1d4ed8',
                    weight: 4,
                    opacity: 1,
                    fillColor: '#fde68a',
                    fillOpacity: 0.65,
                  })
                }
              }}
            />
          </Pane>
        ) : (
          <GeoJSON
            ref={(layer) => {
              geoJsonRef.current = layer
            }}
            data={data as never}
            style={() => baseStyle}
            onEachFeature={(feature, layer) => {
              const boundary = feature as BoundaryFeature
              layer.bindTooltip(`${boundary.properties.name} (${boundary.properties.adminCode})`)
              layer.on({
              mouseover: () => {
                ;(layer as Path).setStyle({
                  color: '#ff3b30',
                    weight: 3,
                    fillColor: '#ffd54f',
                    fillOpacity: 0.45,
                  })
              },
              mouseout: () => {
                ;(layer as Path).setStyle(baseStyle)
              },
              click: () => onFeatureClick(boundary),
            })
          }}
        />
        )}
        <FitToFeatures
          data={data}
          maxZoom={variant === 'province' ? 8 : variant === 'city' ? 11 : 13}
          onApplied={({ fitBoundsApplied: applied, mapBounds: nextMapBounds, firstFeatureBounds: nextFirstBounds }) => {
            setFitBoundsApplied(applied)
            setMapBounds(nextMapBounds)
            setFirstFeatureBounds(nextFirstBounds)
          }}
        />
      </MapContainer>
    </div>
  )
}
