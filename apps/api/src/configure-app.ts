import { randomUUID } from 'node:crypto';
import { ApiExceptionFilter, requestIdKey } from './http/api-exception.filter';
import type { INestApplication } from '@nestjs/common';
export function configureApp(app: INestApplication): void {
  app.enableShutdownHooks();
  app.use((request: { [requestIdKey]?: string }, response: {setHeader: (name: string, value: string) => void}, next: () => void) => {
    const id = randomUUID(); request[requestIdKey] = id;
    response.setHeader('X-Request-Id', id); next();
  });
  app.useGlobalFilters(new ApiExceptionFilter());
}
