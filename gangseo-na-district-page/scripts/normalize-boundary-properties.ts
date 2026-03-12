import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FeatureCollection, Geometry } from 'geojson';
import { normalizeBoundaryProperties } from '../src/utils/normalizeBoundaryProperties';
import type { AreaLevel } from '../src/types';

/*
 * 사용 예시
 * tsx scripts/normalize-boundary-properties.ts \
 *   --input ./src/data/geo/seoulDongs.geojson \
 *   --output ./src/data/geo/seoulDongs.normalized.geojson \
 *   --level dong
 *
 * 설명
 * - 서로 다른 GeoJSON 속성명을 내부 표준 구조로 통일한다.
 * - 표준 필드:
 *   districtCode / districtName / dongCode / dongName / level / centroid
 */

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const inputPath = getArg('--input');
  const outputPath = getArg('--output');
  const level = (getArg('--level') ?? 'district') as AreaLevel;

  if (!inputPath || !outputPath) {
    throw new Error('사용법: tsx scripts/normalize-boundary-properties.ts --input in.geojson --output out.geojson --level district|dong');
  }

  const raw = JSON.parse(await readFile(path.resolve(inputPath), 'utf8')) as FeatureCollection<Geometry, Record<string, unknown>>;

  const normalized = {
    type: 'FeatureCollection',
    features: raw.features.map((feature) => ({
      type: 'Feature',
      properties: normalizeBoundaryProperties((feature.properties ?? {}) as Record<string, unknown>, level),
      geometry: feature.geometry,
    })),
  };

  await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await writeFile(path.resolve(outputPath), `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  console.log(`정규화 완료: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
