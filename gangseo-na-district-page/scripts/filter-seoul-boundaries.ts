import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FeatureCollection, Geometry } from 'geojson';
import { normalizeRegionCode } from '../src/utils/normalizeRegionCode';

/*
 * 사용 예시
 * tsx scripts/filter-seoul-boundaries.ts \
 *   --input ./raw/national_districts.geojson \
 *   --output ./src/data/geo/seoulDistricts.geojson \
 *   --level district \
 *   --prefix 11
 *
 * 설명
 * - 전국 단위 GeoJSON에서 서울시 코드(prefix=11)만 필터링한다.
 * - 자치구는 5자리, 행정동은 8자리 코드 기준으로 사용한다.
 */

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const inputPath = getArg('--input');
  const outputPath = getArg('--output');
  const prefix = getArg('--prefix') ?? '11';
  const level = (getArg('--level') ?? 'district') as 'district' | 'dong';

  if (!inputPath || !outputPath) {
    throw new Error('사용법: tsx scripts/filter-seoul-boundaries.ts --input in.geojson --output out.geojson --level district|dong --prefix 11');
  }

  const raw = JSON.parse(await readFile(path.resolve(inputPath), 'utf8')) as FeatureCollection<Geometry, Record<string, unknown>>;

  const features = raw.features.filter((feature) => {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const code = normalizeRegionCode(
      `${props.districtCode ?? props.dongCode ?? props.code ?? props.sigungu_cd ?? props.adm_cd ?? ''}`,
      level,
    );
    return code.startsWith(prefix);
  });

  await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await writeFile(
    path.resolve(outputPath),
    `${JSON.stringify({ type: 'FeatureCollection', features }, null, 2)}\n`,
    'utf8',
  );
  console.log(`서울시 경계 ${features.length}건 저장: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
