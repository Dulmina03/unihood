import { z } from 'zod';
import { PoiMatchInputSchema, PoiMatchResultSchema } from './poi-matching';
import { PublicIdSchema } from './rest';
// Public preflight accepts only public business name/category/point. Internal
// source IDs, building membership and tuning controls are not client authority.
export const DuplicateCheckInputSchema = PoiMatchInputSchema.pick({kind:true,name:true,category:true,location:true});
export const DuplicateCheckResultSchema = PoiMatchResultSchema.extend({checkOnly:z.literal(true)});
export type DuplicateCheckResult = z.infer<typeof DuplicateCheckResultSchema>;
// Ephemeral client choice, not a persisted contribution or publication grant.
export const DuplicateChoiceSchema = z.discriminatedUnion('action',[
  z.strictObject({action:z.literal('suggest_update'),placeId:PublicIdSchema}),
  z.strictObject({action:z.literal('continue_as_distinct_with_reason'),reason:z.string().trim().min(15).max(500).regex(/^[^\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]+$/).refine(value=>/[\p{L}\p{N}]/u.test(value))}),
  z.strictObject({action:z.literal('cancel')}),
]);
