import type { BoundaryFeatureCollection } from '@/types/admin'

export const normalizedBoundaryExample: BoundaryFeatureCollection = {
  type: 'FeatureCollection',
  metadata: {
    adminLevel: 'province',
    featureCount: 1,
    geometryType: 'Polygon',
    sourceType: 'snapshot',
    sourceDate: '2026-01-01',
  },
  features: [
    {
      type: 'Feature',
      properties: {
        code: '11',
        adminCode: '11',
        name: '서울특별시',
        level: 'province',
        adminLevel: 'province',
        geometryType: 'Polygon',
        sourceType: 'snapshot',
        sourceDate: '2026-01-01',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [126.82, 37.42],
            [127.18, 37.42],
            [127.18, 37.72],
            [126.82, 37.72],
            [126.82, 37.42],
          ],
        ],
      },
    },
  ],
}
