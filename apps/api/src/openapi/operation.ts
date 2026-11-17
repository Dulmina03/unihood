import { SetMetadata } from '@nestjs/common';
import type { PublicSchemaName } from '@unihood/contracts';
export type OperationContract = {summary: string; bodySchema?: PublicSchemaName; protected?: boolean; authorization?: string; querySchema?: PublicSchemaName; responses: Record<string, {schema?: PublicSchemaName; description: string}>};
export const operationKey = 'unihood:openapi';
export const ApiContract = (contract: OperationContract) => SetMetadata(operationKey, contract);
