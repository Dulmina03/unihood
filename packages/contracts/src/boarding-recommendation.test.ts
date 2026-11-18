import { describe, expect, it } from 'vitest';
import { BoardingRecommendationInputSchema, BoardingRecommendationReceiptSchema } from './boarding-recommendation';
const input = { key: '40000000-0000-4000-8000-000000000040', draft: {
  title: 'Synthetic Community Study Home', description: 'Fictional community context; no real accommodation.', locality: null,
  facilities: ['Study space'], privacyAcknowledged: true, mediaGuidanceAcknowledged: true,
} };
describe('student boarding recommendation intake', () => {
  it('accepts only the synthetic held draft shape, never an owner publication contract', () => {
    expect(BoardingRecommendationInputSchema.safeParse(input).success).toBe(true);
    for (const field of ['lat', 'lng', 'entrance', 'visibility', 'publicMapConsent', 'ownerVerified', 'price', 'vacancy', 'phone', 'contact', 'mediaUrl', 'canonicalBoardingId', 'actorId', 'status']) {
      expect(BoardingRecommendationInputSchema.safeParse({ ...input, draft: { ...input.draft, [field]: 'PRIVATE_CANARY' } }).success).toBe(false);
      expect(BoardingRecommendationInputSchema.safeParse({ ...input, [field]: 'PRIVATE_CANARY' }).success).toBe(false);
    }
  });
  it('requires consent, closed broad synthetic locality, bounded text and deduplicated facilities', () => {
    for (const patch of [{ privacyAcknowledged: false }, { mediaGuidanceAcknowledged: false }, { locality: 'Private address canary' }, { title: 'Real unverified claim' }, { facilities: ['Wi-Fi', 'Wi-Fi'] }, { description: 'x'.repeat(401) }, { description: 'bad\ncontrol characters' }]) {
      expect(BoardingRecommendationInputSchema.safeParse({ ...input, draft: { ...input.draft, ...patch } }).success).toBe(false);
    }
  });
  it('returns only a minimal held receipt without private text or implied publication', () => {
    const receipt = { contributionId: input.key, outcome: 'HELD_RECOMMENDATION', reviewState: 'PENDING', publisherKind: 'COMMUNITY_RECOMMENDATION', dataKind: 'SYNTHETIC', published: false };
    expect(BoardingRecommendationReceiptSchema.safeParse(receipt).success).toBe(true);
    expect(BoardingRecommendationReceiptSchema.safeParse({ ...receipt, published: true }).success).toBe(false);
    expect(BoardingRecommendationReceiptSchema.safeParse({ ...receipt, description: 'PRIVATE_CANARY' }).success).toBe(false);
  });
});
