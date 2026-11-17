import { BoardingMapPinSchema, type BoardingMapPin, CampusEntranceSchema, PublicPoiSchema, type PublicPoi } from '@unihood/contracts';
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

export type PublicMapPoint = PublicGate | PublicPoi | (BoardingMapPin & {name:string;location:{lat:number;lng:number}});
export function publicPois(rows:readonly unknown[]):PublicPoi[]{const seen=new Set<string>();return rows.flatMap(row=>{const value=PublicPoiSchema.safeParse(row);if(!value.success||seen.has(value.data.id))return [];seen.add(value.data.id);return [value.data];});}

export function publicBoardings(rows:readonly unknown[]):PublicMapPoint[]{const seen=new Set<string>();return rows.flatMap(row=>{const parsed=BoardingMapPinSchema.safeParse(row);if(!parsed.success||seen.has(parsed.data.id))return [];seen.add(parsed.data.id);const pin=parsed.data;return [{...pin,name:pin.title,location:pin.entrance}];});}
