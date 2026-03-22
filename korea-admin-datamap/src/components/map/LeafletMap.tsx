import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import { useMap } from 'react-leaflet'
import type { Coordinate } from '@/types/admin'

interface LeafletMapProps {
  children: ReactNode
  height: number
  center?: Coordinate
  zoom?: number
  debugLabel?: string
}

function InvalidateMapSize({ debugLabel }: { debugLabel?: string }) {
  const map = useMap()

  useEffect(() => {
    const run = () => {
      map.invalidateSize(false)
      if (import.meta.env.DEV && debugLabel) {
        console.info(`[map:${debugLabel}] invalidateSize`, {
          size: map.getSize(),
          center: map.getCenter(),
          zoom: map.getZoom(),
        })
      }
    }

    run()
    const animationFrame = requestAnimationFrame(run)
    const timeoutId = window.setTimeout(run, 120)

    return () => {
      cancelAnimationFrame(animationFrame)
      window.clearTimeout(timeoutId)
    }
  }, [debugLabel, map])

  return null
}

export function LeafletMap({
  children,
  height,
  center = [36.2, 127.8],
  zoom = 8,
  debugLabel,
}: LeafletMapProps) {
  return (
    <div className="map-frame" style={{ height }}>
      <MapContainer
        key={debugLabel ?? 'leaflet-map'}
        center={center}
        className="map-container"
        scrollWheelZoom={false}
        zoom={zoom}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors, &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <InvalidateMapSize debugLabel={debugLabel} />
        {children}
      </MapContainer>
    </div>
  )
}
