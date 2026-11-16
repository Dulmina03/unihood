import type { StyleSpecification } from 'maplibre-gl';
// Repository-authored synthetic geometry near the existing (0,0) demo fixtures.
// This is not a real campus, road network, basemap or provider dataset.
const blocks = [], roads = [];
for (let x = -4; x <= 4; x++) {
  for (let y = -4; y <= 4; y++) {
    const a = x * .0006, b = y * .0006;
    blocks.push({type: 'Feature' as const, properties: {park: (x + y) % 4 === 0}, geometry: {type: 'Polygon' as const,
      coordinates: [[[a + .00008, b + .00008], [a + .00052, b + .00008], [a + .00052, b + .00052], [a + .00008, b + .00052], [a + .00008, b + .00008]]]}});
  }
}
for (let v = -4; v <= 5; v++) {
  const c = v * .0006;
  for (const coordinates of [[[c, -.003], [c, .003]], [[-.003, c], [.003, c]]]) roads.push({type: 'Feature' as const, properties: {}, geometry: {type: 'LineString' as const, coordinates}});
}
export const syntheticStyle: StyleSpecification = {
  version: 8, name: 'Synthetic map acceptance fixture — not real geography', metadata: {'unihood:demo': true},
  sources: {
    'synthetic-blocks': {type: 'geojson', data: {type: 'FeatureCollection', features: blocks}},
    'synthetic-roads': {type: 'geojson', data: {type: 'FeatureCollection', features: roads}},
  },
  layers: [
    {id: 'background', type: 'background', paint: {'background-color': '#eef2e9'}},
    {id: 'parks', type: 'fill', source: 'synthetic-blocks', paint: {'fill-color': ['case', ['get', 'park'], '#d5e6ce', '#e7e3d6'], 'fill-outline-color': '#c9d6c3'}},
    {id: 'roads-outline', type: 'line', source: 'synthetic-roads', paint: {'line-color': '#d0d8cd', 'line-width': 18}},
    {id: 'roads', type: 'line', source: 'synthetic-roads', paint: {'line-color': '#ffffff', 'line-width': 12}},
  ],
};
