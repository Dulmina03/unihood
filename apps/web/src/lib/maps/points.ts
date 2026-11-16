import { CampusEntranceSchema, PublicPoiSchema, type PublicPoi } from '@unihood/contracts';
export type PublicGate = ReturnType<typeof CampusEntranceSchema.parse>;
// Never accept generic places/boardings or forward arbitrary feature properties into a map.
export function publicGates(rows: readonly unknown[], campusId: string): PublicGate[] {
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    const parsed = CampusEntranceSchema.safeParse(row);
    if (!parsed.success || parsed.data.campusId !== campusId || seen.has(parsed.data.id)) return [];
    seen.add(parsed.data.id); return [parsed.data];
  });
}

export type PublicMapPoint = PublicGate | PublicPoi;
export function publicPois(rows:readonly unknown[]):PublicPoi[]{const seen=new Set<string>();return rows.flatMap(row=>{const value=PublicPoiSchema.safeParse(row);if(!value.success||seen.has(value.data.id))return [];seen.add(value.data.id);return [value.data];});}
