import { z } from 'zod';
import { PublicIdSchema } from './rest';

export const BOARDING_REQUEST_POLICY_VERSION = 'boarding-request-mock-v1' as const;

export const BoardingRequestKindSchema = z.enum(['CONTACT_OWNER', 'REQUEST_LOCATION']);
export const BoardingRequestStatusSchema = z.literal('MOCK_PENDING');

export const BoardingRequestInputSchema = z.strictObject({
  requestKey: PublicIdSchema,
  boardingId: PublicIdSchema,
  kind: BoardingRequestKindSchema,
  syntheticAcknowledged: z.literal(true),
});

const view = {
  requestId: PublicIdSchema,
  boardingId: PublicIdSchema,
  kind: BoardingRequestKindSchema,
  status: BoardingRequestStatusSchema,
  policyVersion: z.literal(BOARDING_REQUEST_POLICY_VERSION),
  synthetic: z.literal(true),
  ownerNotified: z.literal(false),
  locationDisclosed: z.literal(false),
  dataKind: z.literal('SYNTHETIC'),
  createdAt: z.iso.datetime({ offset: true }),
} as const;

export const BoardingRequestReceiptSchema = z.strictObject({ ...view, duplicate: z.boolean() });
export const BoardingRequestStatusViewSchema = z.strictObject(view);

export type BoardingRequestInput = z.infer<typeof BoardingRequestInputSchema>;
export type BoardingRequestKind = z.infer<typeof BoardingRequestKindSchema>;
export type BoardingRequestReceipt = z.infer<typeof BoardingRequestReceiptSchema>;
export type BoardingRequestStatusView = z.infer<typeof BoardingRequestStatusViewSchema>;
