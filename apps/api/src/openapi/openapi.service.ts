import { Injectable, RequestMethod } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { publicJsonSchemas } from '@unihood/contracts';
import { operationKey, type OperationContract } from './operation';
@Injectable()
export class OpenApiService {
  constructor(private readonly modules: ModulesContainer) {}
  document() {
    const paths: Record<string, Record<string, unknown>> = {};
    for (const module of this.modules.values()) for (const wrapper of module.controllers.values()) {
      const controller = wrapper.metatype;
      if (!controller) continue;
      const rawBase: string | string[] = Reflect.getMetadata(PATH_METADATA, controller) ?? '';
      for (const method of Object.getOwnPropertyNames(controller.prototype)) {
        if (method === 'constructor') continue;
        const handler = controller.prototype[method];
        const requestMethod: RequestMethod | undefined = Reflect.getMetadata(METHOD_METADATA, handler);
        if (requestMethod === undefined) continue;
        const contract: OperationContract | undefined = Reflect.getMetadata(operationKey, handler);
        if (!contract) throw new Error('Missing API contract metadata');
        const rawPath: string | string[] = Reflect.getMetadata(PATH_METADATA, handler) ?? '';
        for (const base of Array.isArray(rawBase) ? rawBase : [rawBase]) for (const suffix of Array.isArray(rawPath) ? rawPath : [rawPath]) {
          const path = ('/' + [base, suffix].filter(Boolean).join('/')).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
          const verb = RequestMethod[requestMethod].toLowerCase();
          const responses = Object.fromEntries(Object.entries(contract.responses).map(([status, response]) => [status, {
            description: response.description, headers: {'X-Request-Id': {description: 'Server-generated correlation ID; inbound IDs are ignored.', schema: {type: 'string', format: 'uuid'}}},
            content: {'application/json': {schema: response.schema ? {$ref: `#/components/schemas/${response.schema}`} : {type: 'object', description: 'Generated OpenAPI document'}}},
          }]));
          (paths[path] ??= {})[verb] = {operationId: `${controller.name}_${method}_${path.replace(/\W/g, '_')}`, summary: contract.summary, security: [], responses};
        }
      }
    }
    return {openapi: '3.1.0', info: {title: 'UniHood Phase 0 API', version: '0.0.0', description: 'Only implemented routes are listed. Shared boarding schemas are contract foundations, not live workflows. Identity/owner verification remains deferred.'},
      paths, components: {schemas: publicJsonSchemas()},
      'x-unihood-boundaries': ['Anonymous reads only. Protected writes are denied outside explicit loopback local/test simulation.', 'Readiness retains its existing flat 200/503 monitor contract; other errors use ErrorResponse.', 'Freshness and cross-field refinements require runtime validation in addition to JSON Schema.']};
  }
}
