import { useEffect, useMemo, useRef } from 'react'
import { GeoJSON, MapContainer, Pane, TileLayer, useMap } from 'react-leaflet'
import type { GeoJSON as LeafletGeoJson, LatLngTuple, Path } from 'leaflet'
import L from 'leaflet'
import type { BoundaryFeature, BoundaryFeatureCollection } from '../../types/admin'

interface BoundaryMapProps {
  data: BoundaryFeatureCollection | null
  metricLookup?: Record<string, string>
  selectedCode?: string
  onFeatureClick?: (feature: BoundaryFeature) => void
}

const FitBounds = ({ data }: { data: BoundaryFeatureCollection }) => {
  const map = useMap()
  useEffect(() => {
    const bounds = L.geoJSON(data as never).getBounds()
    if (!bounds.isValid()) return
    map.invalidateSize(false)
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: data.metadata?.adminLevel === 'town' ? 13 : 10 })
  }, [data, map])
  return null
}

export const BoundaryMap = ({ data, metricLookup, selectedCode, onFeatureClick }: BoundaryMapProps) => {
  const geoJsonRef = useRef<LeafletGeoJson | null>(null)
  const level = data?.metadata?.adminLevel ?? data?.features[0]?.properties.adminLevel
  const paneName = level === 'town' ? 'town-pane' : level === 'city' ? 'city-pane' : 'province-pane'
  const tileOpacity = level === 'town' ? 0.48 : 0.8
  const center = useMemo<LatLngTuple>(() => [36.3, 127.9], [])

  if (!data || !data.features.length) return null

  return (
    <div className="map-frame-wrap">
      <MapContainer center={center as never} zoom={7} className="map-frame">
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" opacity={tileOpacity} />
        <Pane name={paneName} style={{ zIndex: level === 'town' ? 650 : level === 'city' ? 620 : 600 }}>
          <GeoJSON
            ref={geoJsonRef}
            data={data as never}
            pane={paneName}
            style={(feature) => {
              const code = feature?.properties?.adminCode
              const isSelected = code === selectedCode
              if (level === 'town') {
                return {
                  color: isSelected ? '#0f4cff' : '#ff0000',
                  weight: isSelected ? 3.8 : 2.8,
                  opacity: 1,
                  fillColor: isSelected ? '#ffb300' : '#ffd54f',
                  fillOpacity: isSelected ? 0.6 : 0.4,
                }
              }
              return {
                color: isSelected ? '#0b6b4b' : '#16304d',
                weight: isSelected ? 2.8 : 1.8,
                opacity: 1,
                fillColor: '#8bd3b4',
                fillOpacity: 0.45,
              }
            }}
            onEachFeature={(feature, layer) => {
              const code = feature.properties.adminCode
              const metric = metricLookup?.[code]
              layer.bindTooltip(metric ? `${feature.properties.name}\n${metric}` : feature.properties.name)
              layer.on({
                mouseover: () => {
                  ;(layer as Path).setStyle({
                    color: '#0f4cff',
                    weight: 4,
                    fillOpacity: level === 'town' ? 0.58 : 0.56,
                  })
                  if ('bringToFront' in layer && typeof layer.bringToFront === 'function') {
                    layer.bringToFront()
                  }
                },
                mouseout: () => {
                  ;(layer as Path).setStyle(
                    level === 'town'
                      ? {
                          color: code === selectedCode ? '#0f4cff' : '#ff0000',
                          weight: code === selectedCode ? 3.8 : 2.8,
                          fillColor: code === selectedCode ? '#ffb300' : '#ffd54f',
                          fillOpacity: code === selectedCode ? 0.6 : 0.4,
                          opacity: 1,
                        }
                      : {
                          color: code === selectedCode ? '#0b6b4b' : '#16304d',
                          weight: code === selectedCode ? 2.8 : 1.8,
                          fillColor: '#8bd3b4',
                          fillOpacity: 0.45,
                          opacity: 1,
                        },
                  )
                },
                click: () => onFeatureClick?.(feature as BoundaryFeature),
              })
            }}
          />
        </Pane>
        <FitBounds data={data} />
      </MapContainer>
    </div>
  )
}
