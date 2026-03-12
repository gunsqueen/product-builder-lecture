import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeDongName } from '../src/utils/normalizeDongName';

interface RawFeature {
  type: string;
  properties?: Record<string, unknown>;
  geometry: unknown;
}

interface RawFeatureCollection {
  type: 'FeatureCollection';
  features: RawFeature[];
}

type PolygonCoordinates = number[][][];
type MultiPolygonCoordinates = number[][][][];

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function convertGeoJson(inputPath: string, outputPath: string): Promise<void> {
  const raw = JSON.parse(await readFile(inputPath, 'utf8')) as RawFeatureCollection;
  const districtName = getArg('--district-name') ?? '강서구';
  const districtCodePrefix = getArg('--district-code-prefix') ?? '11500';
  const filteredFeatures = raw.features.filter((feature) => {
    const props = feature.properties ?? {};
    const admCode = `${props.adm_cd2 ?? props.adm_cd ?? props.EMD_CD ?? ''}`;
    if (admCode.startsWith(districtCodePrefix)) {
      return true;
    }

    const sidoName = `${props.sidonm ?? props.SIDO_NM ?? ''}`;
    const sggName = `${props.sggnm ?? props.SIG_KOR_NM ?? props.districtName ?? ''}`;
    const admName = `${props.adm_nm ?? props.EMD_KOR_NM ?? props.name ?? ''}`;

    if (sggName) {
      return sggName.includes(districtName) && (!sidoName || sidoName.includes('서울'));
    }

    return admName.includes(districtName) && (!sidoName || sidoName.includes('서울'));
  });

  const grouped = new Map<string, { dongCode: string; dongName: string; districtName: string; geometries: Array<{ type: string; coordinates: PolygonCoordinates | MultiPolygonCoordinates }> }>();

  filteredFeatures.forEach((feature, index) => {
    const dongCode = `${feature.properties?.adm_cd2 ?? feature.properties?.adm_cd ?? feature.properties?.EMD_CD ?? `sample-${index}`}`;
    const dongName = normalizeDongName(`${feature.properties?.adm_nm ?? feature.properties?.EMD_KOR_NM ?? feature.properties?.name ?? '이름없음'}`);
    const resolvedDistrictName = `${feature.properties?.sggnm ?? feature.properties?.sgg_nm ?? feature.properties?.SIG_KOR_NM ?? districtName}`;
    const bucket = grouped.get(dongName) ?? {
      dongCode,
      dongName,
      districtName: resolvedDistrictName,
      geometries: [],
    };

    bucket.geometries.push(feature.geometry as { type: string; coordinates: PolygonCoordinates | MultiPolygonCoordinates });
    grouped.set(dongName, bucket);
  });

  const converted = {
    type: 'FeatureCollection',
    features: [...grouped.values()].map((item) => ({
      type: 'Feature',
      properties: {
        dongCode: item.dongCode,
        dongName: item.dongName,
        districtName: item.districtName,
      },
      geometry:
        item.geometries.length === 1
          ? item.geometries[0]
          : {
              type: 'MultiPolygon',
              coordinates: item.geometries.flatMap((geometry) =>
                geometry.type === 'Polygon'
                  ? [geometry.coordinates as PolygonCoordinates]
                  : (geometry.coordinates as MultiPolygonCoordinates),
              ),
            },
    })),
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(converted, null, 2)}\n`, 'utf8');
}

async function convertShapefile(inputPath: string, outputPath: string): Promise<void> {
  /*
   * 실제 SHP 파일 변환은 shpjs 또는 mapshaper를 쓰는 편이 간단합니다.
   * 예:
   *   npm i shpjs
   *   tsx scripts/convert-boundary-to-geojson.ts --input ADM_DONG.shp --output public/data/gangseo_dong_boundaries.geojson
   */
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<{
    default: (source: string) => Promise<unknown>;
  }>;
  const shp = await dynamicImport('shpjs').catch(() => null);
  if (!shp) {
    throw new Error('SHP 변환을 위해서는 shpjs 패키지를 설치해야 합니다. 예: npm i shpjs');
  }

  const geoJson = await shp.default(inputPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(geoJson, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  const inputPath = getArg('--input');
  const outputPath = path.resolve(getArg('--output') ?? 'public/data/gangseo_dong_boundaries.geojson');

  if (!inputPath) {
    throw new Error('사용법: tsx scripts/convert-boundary-to-geojson.ts --input boundary.geojson --output public/data/gangseo_dong_boundaries.geojson');
  }

  const resolvedInput = path.resolve(inputPath);
  const extension = path.extname(resolvedInput).toLowerCase();

  if (extension === '.geojson' || extension === '.json') {
    await convertGeoJson(resolvedInput, outputPath);
  } else if (extension === '.shp') {
    await convertShapefile(resolvedInput, outputPath);
  } else {
    throw new Error(`지원하지 않는 경계 포맷입니다: ${extension}`);
  }

  console.log(`경계 GeoJSON 저장: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
