import { geoJsonRenderHint, renderGeoJsonSvg } from '../lib/geojsonRender';

interface Props {
  data: string;
  title?: string;
  className?: string;
}

export function GeoJsonMap({ data, title = 'Map', className = '' }: Props) {
  const svg = renderGeoJsonSvg(String(data || ''), title);

  if (!svg) {
    return (
      <div className={`rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 ${className}`}>
        GeoJSON map could not be rendered. {geoJsonRenderHint()}
      </div>
    );
  }

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <div
        className="mx-auto h-auto w-full max-w-[760px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
