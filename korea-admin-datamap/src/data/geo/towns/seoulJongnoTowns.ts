import type { BoundaryFeatureCollection } from '@/types/admin'

const town = (
  code: string,
  name: string,
  bounds: [number, number, number, number],
) => {
  const [west, south, east, north] = bounds

  return {
    type: 'Feature' as const,
    properties: {
      code,
      adminCode: code,
      name,
      parentCode: '11110',
      level: 'town' as const,
      adminLevel: 'town' as const,
      geometryType: 'Polygon' as const,
      sourceType: 'snapshot' as const,
      sourceDate: '2026-01-01',
    },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    },
  }
}

const seoulJongnoTowns: BoundaryFeatureCollection = {
  type: 'FeatureCollection',
  metadata: {
    adminLevel: 'town',
    featureCount: 3,
    geometryType: 'Polygon',
    sourceType: 'snapshot',
    sourceDate: '2026-01-01',
  },
  features: [
    town('11110515', '청운효자동', [126.963, 37.579, 126.977, 37.59]),
    town('11110530', '삼청동', [126.978, 37.582, 126.992, 37.593]),
    town('11110680', '혜화동', [126.995, 37.582, 127.012, 37.595]),
  ],
}

export default seoulJongnoTowns
