import { PublicIdSchema } from '@unihood/contracts';
export const FAVOURITES_KEY = 'unihood:guest-entrances:v1';
export const MAX_FAVOURITES = 50;
export type Favourite = {universityId: string; campusId: string; entranceId: string};
export type FavouriteSnapshot = {status: 'ready' | 'corrupt' | 'unavailable'; entries: Favourite[]};
type StorageReader = Pick<Storage, 'getItem'>;
const fields = ['universityId', 'campusId', 'entranceId'] as const;
export function favouriteKey(item: Favourite) {return item.entranceId;}
export function validateFavourite(value: unknown): Favourite | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== fields.length) return null;
  const result = {} as Favourite;
  for (const field of fields) {
    const id = (value as Record<string, unknown>)[field];
    if (!PublicIdSchema.safeParse(id).success) return null;
    result[field] = (id as string).toLowerCase();
  }
  return result;
}
export function readFavourites(storage: StorageReader): FavouriteSnapshot {
  try {
    const raw = storage.getItem(FAVOURITES_KEY);
    if (raw === null) return {status: 'ready', entries: []};
    if (raw.length > 15000) return {status: 'corrupt', entries: []};
    let data;
    try {data = JSON.parse(raw);} catch {return {status: 'corrupt', entries: []};}
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length !== 2 || data.version !== 1 || !Array.isArray(data.entrances) || data.entrances.length > MAX_FAVOURITES) return {status: 'corrupt', entries: []};
    const entries: Favourite[] = [], seen = new Set<string>();
    for (const value of data.entrances) {
      const item = validateFavourite(value);
      if (!item) return {status: 'corrupt', entries: []};
      const key = favouriteKey(item);
      if (!seen.has(key)) {seen.add(key); entries.push(item);}
    }
    return {status: 'ready', entries};
  } catch {return {status: 'unavailable', entries: []};}
}
export function writeFavourites(storage: Pick<Storage, 'setItem'>, entries: Favourite[]) {
  if (entries.length > MAX_FAVOURITES) throw new Error('Saved limit reached');
  const values = entries.map(validateFavourite);
  if (values.some((value) => !value)) throw new Error('Invalid public identity');
  const unique = [...new Map((values as Favourite[]).map((item) => [favouriteKey(item), item])).values()];
  storage.setItem(FAVOURITES_KEY, JSON.stringify({version: 1, entrances: unique}));
}
