import { z } from 'zod';
import { HealthResponseSchema, ReadinessResponseSchema, ReadyResponseSchema, NotReadyResponseSchema } from './health';
import * as enums from './enums';
import { ErrorResponseSchema, PaginationQuerySchema, PageMetaSchema } from './rest';
import { PublicBoardingResponseSchema, PublicBoardingPageSchema, OwnerPublicMapSchema } from './boarding-public';
// No actor identities/memberships or private schemas belong in public OpenAPI components.
export const PublicSchemaRegistry = {
  ...enums, HealthResponse: HealthResponseSchema, ReadinessResponse: ReadinessResponseSchema, ReadyResponse: ReadyResponseSchema, NotReadyResponse: NotReadyResponseSchema,
  ErrorResponse: ErrorResponseSchema, PaginationQuery: PaginationQuerySchema, PageMeta: PageMetaSchema,
  PublicBoardingResponse: PublicBoardingResponseSchema, PublicBoardingPage: PublicBoardingPageSchema,
  OwnerPublicMap: OwnerPublicMapSchema,
};
export type PublicSchemaName = keyof typeof PublicSchemaRegistry;
export function publicJsonSchemas() {
  return Object.fromEntries(Object.entries(PublicSchemaRegistry).map(([name, schema]) => {
    const json = z.toJSONSchema(schema, {target: 'draft-2020-12', unrepresentable: 'throw'});
    return [name, json];
  }));
}
