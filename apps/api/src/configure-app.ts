import { localDuplicateOrigin } from './duplicates/local-cors';
import { randomUUID } from 'node:crypto';
import { ApiExceptionFilter, requestIdKey } from './http/api-exception.filter';
import type { INestApplication } from '@nestjs/common';
export function configureApp(app: INestApplication): void {
  app.enableShutdownHooks();
  app.use((request: {path?:string;method?:string;headers:{origin?:string}}, response: {setHeader:(key:string,value:string)=>void;status:(status:number)=>{end:()=>void}}, next:()=>void)=>{
    if(['/api/v1/duplicates/check','/api/v1/places/proposals'].includes(request.path??'') && localDuplicateOrigin(request.headers.origin)){
      response.setHeader('Access-Control-Allow-Origin',request.headers.origin!);
      response.setHeader('Vary','Origin');
      if(request.method==='OPTIONS'){
        response.setHeader('Access-Control-Allow-Methods','POST');
        response.setHeader('Access-Control-Allow-Headers','Content-Type');
        response.status(204).end();return;
      }
    }
    next();
  });
  app.use((request: { [requestIdKey]?: string }, response: {setHeader: (name: string, value: string) => void}, next: () => void) => {
    const id = randomUUID(); request[requestIdKey] = id;
    response.setHeader('X-Request-Id', id); next();
  });
  app.useGlobalFilters(new ApiExceptionFilter());
}
