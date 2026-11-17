import { z } from 'zod';
import { DuplicateCheckInputSchema, DuplicateChoiceSchema } from './duplicate-check';
import { PoiMatchInputSchema } from './poi-matching';
import { PublicIdSchema } from './rest';
// Internal UNI-025 foundation, not a live public submission contract. Until final
// identity policy, only explicitly synthetic held intents can be persisted.
export const PoiSubmissionInputSchema=z.strictObject({
  key:z.uuid(), draft:DuplicateCheckInputSchema.extend({name:DuplicateCheckInputSchema.shape.name.refine(value=>value.startsWith('Synthetic'))}),
  source:PoiMatchInputSchema.shape.source.unwrap().extend({licenseTag:z.string().trim().min(1).max(160)}).optional(),
  resolution:z.union([DuplicateChoiceSchema.options[0],DuplicateChoiceSchema.options[1]]),
  sourceNote:z.string().trim().min(8).max(240).regex(/^[^\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]+$/).optional(), publicBusinessConfirmed:z.literal(true).optional(),
});
export type PoiSubmissionInput=z.input<typeof PoiSubmissionInputSchema>;
export const PoiSubmissionResultSchema=z.discriminatedUnion('outcome',[
  z.strictObject({outcome:z.literal('PENDING_REVIEW'),proposalId:PublicIdSchema,requiresReview:z.literal(true),reviewState:z.enum(['PENDING','NEEDS_EVIDENCE']).optional()}),
  z.strictObject({outcome:z.literal('EXISTING_PUBLIC_PLACE'),placeId:PublicIdSchema,requiresReview:z.literal(true)}),
  z.strictObject({outcome:z.literal('REVIEW_REQUIRED'),requiresReview:z.literal(true)}),
]);
export type PoiSubmissionResult=z.infer<typeof PoiSubmissionResultSchema>;
