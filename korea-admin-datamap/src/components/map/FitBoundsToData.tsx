import { useEffect } from 'react'
import type { GeoJsonObject } from 'geojson'
import L from 'leaflet'
import { useMap } from 'react-leaflet'
import type { BoundaryFeatureCollection } from '@/types/admin'

interface FitBoundsToDataProps {
  data: BoundaryFeatureCollection
}

export function FitBoundsToData({ data }: FitBoundsToDataProps) {
  const map = useMap()

  useEffect(() => {
    const bounds = L.geoJSON(data as GeoJsonObject).getBounds()
    const maxZoom =
      data.metadata?.adminLevel === 'province'
        ? 8
        : data.metadata?.adminLevel === 'city'
          ? 10
          : 12

    if (bounds.isValid()) {
      const run = () => {
        map.invalidateSize(false)
        map.fitBounds(bounds.pad(0.06), {
          animate: false,
          maxZoom,
        })
      }

      run()
      const animationFrame = requestAnimationFrame(run)

      if (import.meta.env.DEV) {
        console.info('[map:fitBounds]', {
          adminLevel: data.metadata?.adminLevel,
          featureCount: data.features.length,
          maxZoom,
          bounds: bounds.toBBoxString(),
        })
      }

      return () => {
        cancelAnimationFrame(animationFrame)
      }
    }
    if (import.meta.env.DEV) {
      console.warn('[map:fitBounds] invalid bounds', {
        adminLevel: data.metadata?.adminLevel,
        featureCount: data.features.length,
      })
    }

    return undefined
  }, [data, map])

  return null
}
