import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/*
 * 사용 예시
 * tsx scripts/convert-shp-to-geojson.ts \
 *   --input ./raw/TL_SCCO_SIG.shp \
 *   --output ./src/data/geo/seoulDistricts.geojson
 *
 * 설명
 * - SHP/DBF/SHX가 같은 폴더에 있어야 한다.
 * - 이 스크립트는 `shapefile` 패키지가 설치되어 있을 때 바로 사용할 수 있다.
 * - 아직 패키지를 설치하지 않았다면:
 *   npm install -D shapefile
 */

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const inputPath = getArg('--input');
  const outputPath = getArg('--output');

  if (!inputPath || !outputPath) {
    throw new Error('사용법: tsx scripts/convert-shp-to-geojson.ts --input ./raw/file.shp --output ./src/data/geo/output.geojson');
  }

  let shapefileModule: typeof import('shapefile');
  try {
    shapefileModule = await import('shapefile');
  } catch {
    throw new Error('`shapefile` 패키지가 필요합니다. npm install -D shapefile 후 다시 실행하세요.');
  }

  const source = await shapefileModule.open(path.resolve(inputPath));
  const features: Array<Record<string, unknown>> = [];

  while (true) {
    const result = await source.read();
    if (result.done) {
      break;
    }
    features.push({
      type: 'Feature',
      properties: result.value.properties,
      geometry: result.value.geometry,
    });
  }

  const output = {
    type: 'FeatureCollection',
    features,
  };

  await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await writeFile(path.resolve(outputPath), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`GeoJSON 저장 완료: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
