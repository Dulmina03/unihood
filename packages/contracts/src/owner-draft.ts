import { z } from 'zod';
import { BoardingVisibilitySchema } from './enums';
// Synthetic development draft only; never a publication/price/location contract.
export const OwnerWizardDraftSchema=z.strictObject({
 version:z.literal(1),title:z.string().trim().min(10).max(120).startsWith('Synthetic '),
 summary:z.string().trim().min(15).max(400),
 facilities:z.array(z.enum(['Study space','Shared kitchen','Laundry area','Wi-Fi'])).max(4).refine(v=>new Set(v).size===v.length),
 requestedVisibility:BoardingVisibilitySchema,locality:z.enum(['Synthetic North Quarter','Synthetic Garden District']).nullable(),
 mediaConsent:z.boolean(),
}).refine(v=>v.requestedVisibility==='AREA_ONLY'?v.locality!==null:v.locality===null);
export const OwnerDraftCheckSchema=z.strictObject({outcome:z.literal('DRAFT_ONLY'),published:z.literal(false),draft:OwnerWizardDraftSchema});
export type OwnerWizardDraft=z.infer<typeof OwnerWizardDraftSchema>;
