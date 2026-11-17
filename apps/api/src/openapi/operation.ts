import { SetMetadata } from '@nestjs/common';
import type { PublicSchemaName } from '@unihood/contracts';
export type OperationContract = {summary: string; bodySchema?: PublicSchemaName; requestContentType?: 'multipart/form-data'; protected?: boolean; authorization?: string; querySchema?: PublicSchemaName; responses: Record<string, {schema?: PublicSchemaName; contentType?: 'image/webp'; description: string}>};
export const operationKey = 'unihood:openapi';
export const ApiContract = (contract: OperationContract) => SetMetadata(operationKey, contract);
