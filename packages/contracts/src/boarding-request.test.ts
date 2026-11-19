import { describe, expect, it } from 'vitest';
import {
  BOARDING_REQUEST_POLICY_VERSION,
  BoardingRequestInputSchema,
  BoardingRequestReceiptSchema,
  BoardingRequestStatusViewSchema,
  publicJsonSchemas,
} from './index';

const boardingId = '00000000-0000-4000-8000-000000000001';
const requestId = '46000000-0000-4000-8000-000000000001';
const base = {
  requestId,
  boardingId,
  kind: 'CONTACT_OWNER',
  status: 'MOCK_PENDING',
  policyVersion: BOARDING_REQUEST_POLICY_VERSION,
  synthetic: true,
  ownerNotified: false,
  locationDisclosed: false,
  dataKind: 'SYNTHETIC',
  createdAt: '2026-11-19T00:00:00.000000Z',
} as const;

describe('UNI-046 mock boarding request contracts', () => {
  it('accepts only the two explicit request kinds with synthetic acknowledgement', () => {
    for (const kind of ['CONTACT_OWNER', 'REQUEST_LOCATION'] as const) {
      expect(BoardingRequestInputSchema.parse({ requestKey: requestId, boardingId, kind, syntheticAcknowledged: true })).toMatchObject({ kind });
    }
    expect(BoardingRequestInputSchema.safeParse({ requestKey: requestId, boardingId, kind: 'MESSAGE_OWNER', syntheticAcknowledged: true }).success).toBe(false);
    expect(BoardingRequestInputSchema.safeParse({ requestKey: requestId, boardingId, kind: 'CONTACT_OWNER', syntheticAcknowledged: false }).success).toBe(false);
  });

  it('rejects private contact, coordinates or authority claims from caller input', () => {
    for (const key of ['phone', 'email', 'latitude', 'longitude', 'visibility', 'ownerId', 'granted']) {
      expect(BoardingRequestInputSchema.safeParse({ requestKey: requestId, boardingId, kind: 'CONTACT_OWNER', syntheticAcknowledged: true, [key]: 'canary' }).success).toBe(false);
    }
  });

  it('keeps receipts and status free of private owner facts and false success claims', () => {
    const receipt = BoardingRequestReceiptSchema.parse({ ...base, duplicate: false });
    expect(receipt).toMatchObject({ status: 'MOCK_PENDING', synthetic: true, ownerNotified: false, locationDisclosed: false });
    expect(JSON.stringify(receipt)).not.toMatch(/phone|email|coordinate|latitude|longitude|contacted|granted/i);
    expect(BoardingRequestStatusViewSchema.parse(base)).toMatchObject({ requestId, dataKind: 'SYNTHETIC' });
    expect(BoardingRequestReceiptSchema.safeParse({ ...base, duplicate: false, phone: '+12025550100' }).success).toBe(false);
    expect(BoardingRequestStatusViewSchema.safeParse({ ...base, locationDisclosed: true }).success).toBe(false);
  });

  it('publishes only non-private request schemas in OpenAPI', () => {
    const schemas = publicJsonSchemas();
    expect(schemas.BoardingRequestInput).toBeDefined();
    expect(schemas.BoardingRequestReceipt).toBeDefined();
    expect(schemas.BoardingRequestStatusView).toBeDefined();
    expect(JSON.stringify(schemas)).not.toMatch(/requester_ref|request_key|payload_hash/);
  });
});
