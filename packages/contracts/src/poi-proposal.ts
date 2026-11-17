import { z } from 'zod';
import { PoiSubmissionInputSchema } from './poi-submission';
import { PublicIdSchema } from './rest';
export const PoiReviewStateSchema=z.enum(['PENDING','NEEDS_EVIDENCE']);
export const PoiRiskFlagSchema=z.enum(['PRIVATE_TEXT','CONTACT_TEXT','EXTERNAL_REFERENCE']);
export type PoiRiskFlag=z.infer<typeof PoiRiskFlagSchema>;
export const PoiSourceNoteSchema=z.string().trim().min(8).max(240).regex(/^[^\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]+$/);
// Explicit allowlist: no actor, source-provider IDs, status, owner fields or media.
export const PublicPoiProposalInputSchema=z.strictObject({key:PoiSubmissionInputSchema.shape.key,
 draft:PoiSubmissionInputSchema.shape.draft.extend({name:PoiSubmissionInputSchema.shape.draft.shape.name.regex(/^Synthetic/)}), resolution:PoiSubmissionInputSchema.shape.resolution,
 sourceNote:PoiSourceNoteSchema, publicBusinessConfirmed:z.literal(true)});
export const PublicPoiProposalResultSchema=z.discriminatedUnion('outcome',[
 z.strictObject({outcome:z.literal('PENDING_REVIEW'),proposalId:PublicIdSchema,requiresReview:z.literal(true),reviewState:PoiReviewStateSchema}),
 z.strictObject({outcome:z.literal('EXISTING_PUBLIC_PLACE'),placeId:PublicIdSchema,requiresReview:z.literal(true)}),
 z.strictObject({outcome:z.literal('REVIEW_REQUIRED'),requiresReview:z.literal(true)}),
]);
export type PublicPoiProposalInput=z.infer<typeof PublicPoiProposalInputSchema>;
export type PublicPoiProposalResult=z.infer<typeof PublicPoiProposalResultSchema>;
