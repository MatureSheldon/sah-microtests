import type { GeoJsonFeatureCollection } from './geojsonRender';

export type BaseMapId = 'world-outline' | 'india-outline' | 'india-political';

const outlineStyle = {
  fill: '#e0f2fe',
  stroke: '#2563eb',
  strokeWidth: 1.6,
  opacity: 0.62,
};

const boundaryStyle = {
  stroke: '#64748b',
  strokeWidth: 0.7,
  dashed: true,
};

function polygon(name: string, coordinates: number[][], properties: Record<string, unknown> = {}) {
  return {
    type: 'Feature' as const,
    properties: { name, ...outlineStyle, ...properties },
    geometry: { type: 'Polygon', coordinates: [coordinates] },
  };
}

function line(name: string, coordinates: number[][], properties: Record<string, unknown> = {}) {
  return {
    type: 'Feature' as const,
    properties: { name, ...boundaryStyle, showLabel: false, ...properties },
    geometry: { type: 'LineString', coordinates },
  };
}

function point(name: string, coordinates: number[], properties: Record<string, unknown> = {}) {
  return {
    type: 'Feature' as const,
    properties: { name, stroke: '#0f172a', ...properties },
    geometry: { type: 'Point', coordinates },
  };
}

export const GEOJSON_BASE_MAPS: Record<BaseMapId, GeoJsonFeatureCollection> = {
  'world-outline': {
    type: 'FeatureCollection',
    features: [
      polygon('North America', [[-168, 72], [-138, 70], [-126, 55], [-112, 49], [-97, 50], [-82, 45], [-65, 50], [-55, 62], [-72, 72], [-108, 76], [-168, 72]]),
      polygon('South America', [[-81, 12], [-60, 8], [-44, -4], [-36, -20], [-50, -55], [-67, -48], [-76, -15], [-81, 12]]),
      polygon('Europe', [[-10, 36], [2, 44], [18, 45], [32, 55], [42, 66], [12, 72], [-9, 60], [-10, 36]]),
      polygon('Africa', [[-18, 34], [12, 37], [36, 30], [51, 10], [42, -35], [20, -35], [4, -25], [-14, 2], [-18, 34]]),
      polygon('Asia', [[38, 8], [50, 30], [75, 40], [96, 55], [128, 50], [154, 60], [178, 50], [145, 20], [122, 6], [102, 20], [78, 8], [55, 5], [38, 8]]),
      polygon('Australia', [[112, -11], [154, -11], [153, -32], [136, -43], [114, -35], [112, -11]]),
      polygon('Antarctica', [[-170, -64], [-80, -70], [0, -66], [80, -71], [170, -64], [160, -82], [-160, -82], [-170, -64]], { opacity: 0.42 }),
    ],
  },
  'india-outline': {
    type: 'FeatureCollection',
    features: [
      polygon('India', [[68.1, 23.8], [69.5, 20.4], [72.4, 18.0], [73.5, 14.0], [75.2, 8.2], [77.8, 8.1], [80.0, 13.0], [82.2, 16.8], [86.0, 20.2], [88.0, 22.0], [88.9, 24.4], [92.5, 25.0], [95.6, 27.4], [94.0, 29.4], [89.6, 27.9], [86.4, 27.5], [83.3, 27.9], [80.2, 30.9], [77.5, 34.3], [74.5, 34.8], [72.2, 31.2], [70.5, 27.0], [68.1, 23.8]], { label: 'India' }),
    ],
  },
  'india-political': {
    type: 'FeatureCollection',
    features: [
      polygon('India', [[68.1, 23.8], [69.5, 20.4], [72.4, 18.0], [73.5, 14.0], [75.2, 8.2], [77.8, 8.1], [80.0, 13.0], [82.2, 16.8], [86.0, 20.2], [88.0, 22.0], [88.9, 24.4], [92.5, 25.0], [95.6, 27.4], [94.0, 29.4], [89.6, 27.9], [86.4, 27.5], [83.3, 27.9], [80.2, 30.9], [77.5, 34.3], [74.5, 34.8], [72.2, 31.2], [70.5, 27.0], [68.1, 23.8]], { label: '' }),
      line('North-west boundary', [[74.5, 34.8], [75.3, 31.0], [74.2, 29.0], [72.7, 26.3], [70.5, 24.0]]),
      line('Gangetic belt boundary', [[77.5, 34.3], [78.0, 30.1], [80.6, 28.4], [84.0, 27.4], [88.9, 26.5], [92.5, 25.0]]),
      line('Central India boundary', [[72.4, 23.2], [76.0, 23.8], [80.2, 24.1], [84.0, 23.2], [87.9, 22.2]]),
      line('Western India boundary', [[72.4, 18.0], [74.6, 20.5], [76.2, 23.8], [77.4, 28.0]]),
      line('Deccan boundary', [[75.2, 8.2], [76.0, 13.5], [77.2, 16.0], [78.5, 19.0], [80.2, 24.1]]),
      line('Eastern peninsula boundary', [[80.0, 13.0], [81.0, 16.5], [82.2, 19.0], [84.0, 23.2]]),
      line('North-east link', [[88.9, 24.4], [91.0, 25.2], [95.6, 27.4]]),
      point('J&K/Ladakh', [76.2, 33.7]),
      point('Himachal', [77.4, 31.8]),
      point('Punjab', [75.1, 30.8]),
      point('Haryana', [76.3, 29.2]),
      point('Rajasthan', [73.7, 26.8]),
      point('Gujarat', [71.9, 22.6]),
      point('Maharashtra', [75.3, 19.6]),
      point('Goa', [74.0, 15.3]),
      point('Karnataka', [76.1, 14.8]),
      point('Kerala', [76.3, 10.2]),
      point('Tamil Nadu', [78.4, 11.0]),
      point('Telangana', [79.0, 17.8]),
      point('Andhra Pradesh', [80.5, 15.7]),
      point('Madhya Pradesh', [78.2, 23.3]),
      point('Chhattisgarh', [82.1, 21.2]),
      point('Odisha', [85.6, 20.2]),
      point('Jharkhand', [85.6, 23.7]),
      point('Bihar', [85.7, 25.8]),
      point('Uttar Pradesh', [80.8, 27.2]),
      point('Uttarakhand', [79.3, 30.2]),
      point('West Bengal', [88.1, 23.8]),
      point('Sikkim', [88.5, 27.5]),
      point('Assam', [92.9, 26.0]),
      point('NE states', [94.0, 24.8]),
    ],
  },
};

export function getGeoJsonBaseMap(id: string | undefined | null): GeoJsonFeatureCollection | null {
  const normalized = String(id || '').trim().toLowerCase().replace(/_/g, '-');
  if (!normalized) return null;
  return GEOJSON_BASE_MAPS[normalized as BaseMapId] || null;
}

export function geoJsonBaseMapIds() {
  return Object.keys(GEOJSON_BASE_MAPS) as BaseMapId[];
}
