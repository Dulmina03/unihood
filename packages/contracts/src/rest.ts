import { z } from 'zod';
export type RuntimeSchema<T> = z.ZodType<T>;
export const PublicIdSchema = z.uuid();
export const PublicFieldSchema = z.enum(['request', 'id', 'title', 'q', 'page', 'pageSize', 'sort', 'visibility', 'publisherKind', 'gateId', 'boardingId', 'timeContext', 'includeAlternatives']);
export const ValidationReasonSchema = z.enum(['INVALID_VALUE', 'UNKNOWN_FIELD']);
export const ErrorCodeSchema = z.enum(['BAD_REQUEST', 'VALIDATION_FAILED', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'UNPROCESSABLE_ENTITY', 'RATE_LIMITED', 'PAYLOAD_TOO_LARGE', 'FEATURE_NOT_AVAILABLE', 'SERVICE_UNAVAILABLE', 'INTERNAL_ERROR']);
export const ErrorDetailSchema = z.strictObject({field: PublicFieldSchema, reason: ValidationReasonSchema});
export const ErrorResponseSchema = z.strictObject({error: z.strictObject({
  code: ErrorCodeSchema, message: z.string().min(1).max(160), details: z.array(ErrorDetailSchema).max(20), requestId: z.uuid(),
})});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
// HTTP wire strings are intentionally distinct from parsed numeric pagination.
const positiveInteger = z.string().regex(/^[1-9][0-9]{0,6}$/);
export const PaginationQuerySchema = z.strictObject({
  page: positiveInteger.optional(), pageSize: z.string().regex(/^(?:[1-9]|[1-9][0-9]|100)$/).optional(),
  sort: z.enum(['newest', 'title']).optional(), q: z.string().trim().min(1).max(120).optional(),
});
export function parsePaginationQuery(input: unknown) {
  const value = PaginationQuerySchema.parse(input);
  return {page: Number(value.page ?? '1'), pageSize: Number(value.pageSize ?? '20'), sort: value.sort ?? 'newest', ...(value.q ? {q: value.q} : {})};
}
export const PageMetaSchema = z.strictObject({page: z.number().int().min(1).max(9999999), pageSize: z.number().int().min(1).max(100), hasNextPage: z.boolean()});
export function paginatedSchema<T extends z.ZodType>(item: T) {return z.strictObject({items: z.array(item).max(100), page: PageMetaSchema}).refine((value) => value.items.length <= value.page.pageSize, 'Page size exceeded');}
// Unknown input keys and values never become response details.
export function publicValidationDetails(issues: ReadonlyArray<{path: ReadonlyArray<PropertyKey>; code: string}>) {
  return issues.slice(0, 20).map((issue) => ({
    field: PublicFieldSchema.safeParse(issue.path[0]).success ? PublicFieldSchema.parse(issue.path[0]) : 'request' as const,
    reason: issue.code === 'unrecognized_keys' ? 'UNKNOWN_FIELD' as const : 'INVALID_VALUE' as const,
  }));
}
