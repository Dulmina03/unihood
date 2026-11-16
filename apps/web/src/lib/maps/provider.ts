// Only public, credential-free configuration crosses the server/client boundary.
export type MapProvider = {kind: 'missing' | 'invalid'} | {kind: 'openfreemap'; style: 'liberty' | 'bright'};
export function mapProvider(env: Record<string, string | undefined>): MapProvider {
  if (!env.MAP_PROVIDER || env.MAP_PROVIDER === 'disabled') return {kind: 'missing'};
  if (env.MAP_PROVIDER !== 'openfreemap' || (env.MAP_STYLE && !['liberty', 'bright'].includes(env.MAP_STYLE))) return {kind: 'invalid'};
  return {kind: 'openfreemap', style: env.MAP_STYLE === 'bright' ? 'bright' : 'liberty'};
}
export const mapAttribution = [
  {label: 'OpenFreeMap', href: 'https://openfreemap.org/'},
  {label: '© OpenMapTiles', href: 'https://openmaptiles.org/'},
  {label: '© OpenStreetMap', href: 'https://www.openstreetmap.org/copyright'},
] as const;
export function styleUrl(provider: Extract<MapProvider, {kind: 'openfreemap'}>) {
  // No arbitrary URLs/tokens, including the old bootstrap style URL, are serialized.
  return `https://tiles.openfreemap.org/styles/${provider.style}`;
}
export function allowedMapResource(url: string) {
  try {const parsed = new URL(url); return parsed.protocol === 'https:' && parsed.hostname === 'tiles.openfreemap.org' && !parsed.port && !parsed.username && !parsed.password && !parsed.search && !parsed.hash;}
  catch {return false;}
}
