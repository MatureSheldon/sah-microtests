import { getGeoJsonBaseMap, geoJsonBaseMapIds } from './geojsonBaseMaps';

export type Position = [number, number] | [number, number, number];

export type GeoJsonGeometry = {
  type: string;
  coordinates?: unknown;
  geometries?: GeoJsonGeometry[];
};

export type GeoJsonFeature = {
  type: 'Feature';
  geometry: GeoJsonGeometry | null;
  properties?: Record<string, unknown>;
};

export type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
};

const WIDTH = 760;
const HEIGHT = 430;
const PAD = 34;

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asFeatures(input: unknown): GeoJsonFeature[] {
  if (!isRecord(input) || typeof input.type !== 'string') return [];
  if (input.type === 'FeatureCollection') return Array.isArray(input.features) ? input.features as GeoJsonFeature[] : [];
  if (input.type === 'Feature') return [input as GeoJsonFeature];
  return [{ type: 'Feature', geometry: input as GeoJsonGeometry, properties: {} }];
}

function featuresFromPayload(value: unknown): GeoJsonFeature[] {
  if (typeof value === 'string') {
    return getGeoJsonBaseMap(value)?.features || [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(item => asFeatures(item));
  }

  if (!isRecord(value)) return [];

  const baseMapId = String(value.base_map || value.baseMap || '').trim();
  const baseFeatures = getGeoJsonBaseMap(baseMapId)?.features || [];

  if (baseMapId) {
    const overlayValue = value.overlays || value.overlay || value.data || [];
    return [...baseFeatures, ...featuresFromPayload(overlayValue)];
  }

  return asFeatures(value);
}

export function parseMapFeatures(value: string): GeoJsonFeature[] {
  const trimmed = String(value || '').trim();
  if (!trimmed) return [];

  const directBase = getGeoJsonBaseMap(trimmed);
  if (directBase) return directBase.features;

  const parsed = parseJson(trimmed);
  return featuresFromPayload(parsed);
}

function isPosition(value: unknown): value is Position {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number';
}

function collectPositions(value: unknown, out: Position[] = []): Position[] {
  if (isPosition(value)) {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectPositions(item, out));
  }
  return out;
}

function bounds(features: GeoJsonFeature[]) {
  const positions = features.flatMap(feature => collectPositions(feature.geometry?.coordinates));
  if (!positions.length) return null;
  const xs = positions.map(p => p[0]);
  const ys = positions.map(p => p[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function makeProjector(features: GeoJsonFeature[]) {
  const box = bounds(features) || { minX: 0, maxX: 100, minY: 0, maxY: 100 };
  const spanX = Math.max(box.maxX - box.minX, 1);
  const spanY = Math.max(box.maxY - box.minY, 1);
  const scale = Math.min((WIDTH - PAD * 2) / spanX, (HEIGHT - PAD * 2) / spanY);
  const drawnW = spanX * scale;
  const drawnH = spanY * scale;
  const offsetX = (WIDTH - drawnW) / 2;
  const offsetY = (HEIGHT - drawnH) / 2;

  return (position: Position) => {
    const x = offsetX + (position[0] - box.minX) * scale;
    const y = HEIGHT - (offsetY + (position[1] - box.minY) * scale);
    return [x, y] as const;
  };
}

function pathFromRing(ring: unknown, project: (position: Position) => readonly [number, number]) {
  if (!Array.isArray(ring)) return '';
  const points = ring.filter(isPosition).map(project);
  if (!points.length) return '';
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ' Z';
}

function linePoints(line: unknown, project: (position: Position) => readonly [number, number]) {
  if (!Array.isArray(line)) return '';
  return line.filter(isPosition).map(project).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

function labelFor(feature: GeoJsonFeature) {
  const props = feature.properties || {};
  if (props.showLabel === false || props.label === false) return '';
  return String(props.label || props.name || props.title || '').trim();
}

function styleFor(feature: GeoJsonFeature) {
  const props = feature.properties || {};
  return {
    fill: String(props.fill || '#dbeafe'),
    stroke: String(props.stroke || '#2563eb'),
    strokeWidth: Number(props.strokeWidth || props['stroke-width'] || 2),
    opacity: Number(props.opacity || 0.85),
    dashed: Boolean(props.dashed),
    arrow: Boolean(props.arrow),
  };
}

function centroid(feature: GeoJsonFeature, project: (position: Position) => readonly [number, number]) {
  const positions = collectPositions(feature.geometry?.coordinates);
  if (!positions.length) return null;
  const points = positions.map(project);
  const x = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const y = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  return [x, y] as const;
}

function renderGeometry(feature: GeoJsonFeature, index: number, project: (position: Position) => readonly [number, number]): string {
  const geometry = feature.geometry;
  if (!geometry) return '';
  const style = styleFor(feature);
  const strokeDasharray = style.dashed ? ' stroke-dasharray="7 6"' : '';
  const markerEnd = style.arrow ? ' marker-end="url(#geojson-arrow)"' : '';

  if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map((ring, ringIndex) => {
      const d = pathFromRing(ring, project);
      if (!d) return '';
      const fill = ringIndex === 0 ? style.fill : '#ffffff';
      const fillOpacity = ringIndex === 0 ? style.opacity : 1;
      return `<path d="${d}" fill="${escapeXml(fill)}" fill-opacity="${fillOpacity}" stroke="${escapeXml(style.stroke)}" stroke-width="${style.strokeWidth}"/>`;
    }).join('');
  }

  if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map(polygon => Array.isArray(polygon)
      ? polygon.map((ring, ringIndex) => {
          const d = pathFromRing(ring, project);
          if (!d) return '';
          const fill = ringIndex === 0 ? style.fill : '#ffffff';
          const fillOpacity = ringIndex === 0 ? style.opacity : 1;
          return `<path d="${d}" fill="${escapeXml(fill)}" fill-opacity="${fillOpacity}" stroke="${escapeXml(style.stroke)}" stroke-width="${style.strokeWidth}"/>`;
        }).join('')
      : '').join('');
  }

  if (geometry.type === 'LineString') {
    const points = linePoints(geometry.coordinates, project);
    return points ? `<polyline points="${points}" fill="none" stroke="${escapeXml(style.stroke)}" stroke-width="${style.strokeWidth}"${strokeDasharray}${markerEnd}/>` : '';
  }

  if (geometry.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map(line => {
      const points = linePoints(line, project);
      return points ? `<polyline points="${points}" fill="none" stroke="${escapeXml(style.stroke)}" stroke-width="${style.strokeWidth}"${strokeDasharray}${markerEnd}/>` : '';
    }).join('');
  }

  if (geometry.type === 'Point' && isPosition(geometry.coordinates)) {
    const [x, y] = project(geometry.coordinates);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${escapeXml(style.stroke)}" stroke="#ffffff" stroke-width="2"/>`;
  }

  if (geometry.type === 'MultiPoint' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.filter(isPosition).map(position => {
      const [x, y] = project(position);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${escapeXml(style.stroke)}" stroke="#ffffff" stroke-width="2"/>`;
    }).join('');
  }

  if (geometry.type === 'GeometryCollection' && Array.isArray(geometry.geometries)) {
    return geometry.geometries.map((item, geometryIndex) => renderGeometry({ ...feature, geometry: item }, index * 100 + geometryIndex, project)).join('');
  }

  return '';
}

export function renderGeoJsonSvg(data: string, title = 'Map'): string | null {
  const features = parseMapFeatures(data).filter(feature => feature.geometry);
  if (!features.length) return null;
  const project = makeProjector(features);
  const geometries = features.map((feature, index) => renderGeometry(feature, index, project)).join('');
  const labels = features.map((feature) => {
    const label = labelFor(feature);
    const center = centroid(feature, project);
    if (!label || !center) return '';
    const [x, y] = center;
    return `<text x="${x.toFixed(1)}" y="${(y - 8).toFixed(1)}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" fill="#1e293b" paint-order="stroke" stroke="#ffffff" stroke-width="4">${escapeXml(label)}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(title)}"><defs><marker id="geojson-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626"/></marker></defs><rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="12" fill="#f8fafc" stroke="#cbd5e1"/><g>${geometries}</g><g>${labels}</g></svg>`;
}

export function geoJsonRenderHint() {
  return `Use valid GeoJSON or one of: ${geoJsonBaseMapIds().join(', ')}.`;
}
