import { useEffect, useMemo } from 'react';
import type { GeoJsonObject } from 'geojson';
import type { PathOptions } from 'leaflet';
import L from 'leaflet';
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet';
import { getColorByRate, getTurnoutColor } from '../utils/colorScale';
import { formatHouseholds, formatPercent, formatPopulation } from '../utils/formatters';
import { normalizeRegionCode } from '../utils/normalizeRegionCode';
import type { JoinedBoundaryFeature, MapMetricKey } from '../types';

interface GeoMapProps {
  items: JoinedBoundaryFeature[];
  selectedCode?: string;
  metricKey?: MapMetricKey;
  height?: number;
  errorMessage?: string | null;
  onFeatureClick?: (code: string) => void;
}

export function GeoMap({
  items,
  selectedCode,
  metricKey = 'population',
  height = 480,
  errorMessage,
  onFeatureClick,
}: GeoMapProps) {
  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: items.map((item) => item.feature),
    }),
    [items],
  );

  const valueRange = useMemo(() => {
    const values = items
      .map((item) => getMetricValue(item, metricKey))
      .filter((value): value is number => value !== undefined);

    return {
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 1,
    };
  }, [items, metricKey]);

  if (errorMessage) {
    return <div className="map-fallback">경계 데이터를 불러오지 못했습니다. {errorMessage}</div>;
  }

  if (!items.length) {
    return <div className="map-fallback">경계 데이터가 없어서 지도를 표시할 수 없습니다.</div>;
  }

  return (
    <div className="map-shell">
      <MapContainer className="leaflet-map" scrollWheelZoom style={{ height }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToGeoJson geojson={geojson} />
        <GeoJSON
          data={geojson as GeoJsonObject}
          onEachFeature={(feature, layer) => {
            const properties = feature.properties as JoinedBoundaryFeature['feature']['properties'];
            const code = normalizeRegionCode(properties.dongCode ?? properties.districtCode, properties.level);
            const joined = items.find((item) => {
              const itemCode = normalizeRegionCode(
                item.feature.properties.dongCode ?? item.feature.properties.districtCode,
                item.feature.properties.level,
              );
              return itemCode === code;
            });

            layer.bindTooltip(
              `
                <div class="map-tooltip">
                  <strong>${properties.level === 'dong' ? properties.dongName ?? '행정동' : properties.districtName}</strong>
                  <div>${formatPopulation(joined?.population?.totalPopulation)}</div>
                  <div>${formatHouseholds(joined?.population?.households)}</div>
                  ${joined?.election ? `<div>투표율 ${formatPercent(joined.election.turnout)}</div>` : ''}
                </div>
              `,
            );

            layer.on({
              click: () => {
                onFeatureClick?.(code);
              },
            });

            if (onFeatureClick) {
              layer.on('add', () => {
                const element =
                  'getElement' in layer && typeof layer.getElement === 'function' ? layer.getElement() : null;
                if (element) {
                  element.style.cursor = 'pointer';
                }
              });
            }
          }}
          style={(feature) => {
            if (!feature) {
              return getFeatureStyle(undefined, metricKey, valueRange.min, valueRange.max, selectedCode);
            }
            const properties = feature.properties as JoinedBoundaryFeature['feature']['properties'];
            const code = normalizeRegionCode(properties.dongCode ?? properties.districtCode, properties.level);
            const joined = items.find((item) => {
              const itemCode = normalizeRegionCode(
                item.feature.properties.dongCode ?? item.feature.properties.districtCode,
                item.feature.properties.level,
              );
              return itemCode === code;
            });
            return getFeatureStyle(joined, metricKey, valueRange.min, valueRange.max, selectedCode);
          }}
        />
      </MapContainer>
    </div>
  );
}

function FitToGeoJson({ geojson }: { geojson: { type: 'FeatureCollection'; features: JoinedBoundaryFeature['feature'][] } }) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.geoJSON(geojson as GeoJsonObject).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.2));
    }
  }, [geojson, map]);

  return null;
}

function getMetricValue(item: JoinedBoundaryFeature | undefined, metricKey: MapMetricKey) {
  if (!item) {
    return undefined;
  }

  if (metricKey === 'turnout') {
    return item.election?.turnout;
  }

  if (metricKey === 'households') {
    return item.population?.households;
  }

  return item.population?.totalPopulation;
}

function getFeatureStyle(
  item: JoinedBoundaryFeature | undefined,
  metricKey: MapMetricKey,
  min: number,
  max: number,
  selectedCode?: string,
): PathOptions {
  const code = item
    ? normalizeRegionCode(item.feature.properties.dongCode ?? item.feature.properties.districtCode, item.feature.properties.level)
    : '';
  const value = getMetricValue(item, metricKey);
  const fillColor = metricKey === 'turnout' ? getTurnoutColor(value) : getColorByRate(value, min, max);

  return {
    color: selectedCode === code ? '#0f172a' : '#475569',
    weight: selectedCode === code ? 2.5 : 1,
    fillOpacity: 0.78,
    fillColor,
  };
}
