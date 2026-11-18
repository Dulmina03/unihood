import { localDuplicateOrigin } from './duplicates/local-cors';
import { randomUUID } from 'node:crypto';
import { ApiExceptionFilter, requestIdKey } from './http/api-exception.filter';
import type { INestApplication } from '@nestjs/common';
export function configureApp(app: INestApplication): void {
  app.enableShutdownHooks();
  app.use((request: {path?:string;method?:string;headers:{origin?:string}}, response: {setHeader:(key:string,value:string)=>void;status:(status:number)=>{end:()=>void}}, next:()=>void)=>{
    if((['/api/v1/contributions','/api/v1/contributions/correction','/api/v1/duplicates/check','/api/v1/places/proposals','/api/v1/contributions/boarding','/api/v1/contributions/boarding/duplicates','/api/v1/contributions/boarding/resolve'].includes(request.path??'')||/^\/api\/v1\/reports(?:\/[0-9a-f-]{36}(?:\/(?:appeal|operator))?)?$/.test(request.path??'')||/^\/api\/v1\/boardings\/[0-9a-f-]{36}\/units\/[0-9a-f-]{36}\/availability$/.test(request.path??'')||/^\/api\/v1\/boardings\/[0-9a-f-]{36}\/(?:prices|vacancy-confirmations)$/.test(request.path??'')||/^\/api\/v1\/owner\/boardings\/[0-9a-f-]{36}\/(?:draft-check|visibility-preview|map-settings|inventory|privacy\/(?:overview|events|contact|media(?:\/[0-9a-f-]{36}(?:\/content)?)?)|units(?:\/[0-9a-f-]{36}(?:\/(?:prices|vacancy-confirmations))?)?)$/.test(request.path??'')) && localDuplicateOrigin(request.headers.origin)){
      response.setHeader('Access-Control-Allow-Origin',request.headers.origin!);
      response.setHeader('Vary','Origin');
      if(request.method==='OPTIONS'){
        response.setHeader('Access-Control-Allow-Methods',request.path==='/api/v1/contributions'?'GET':/^\/api\/v1\/reports/.test(request.path??'')?'GET, POST':(request.path?.endsWith('/inventory')||/\/owner\/boardings\/[0-9a-f-]{36}\/units\/[0-9a-f-]{36}\/(?:prices|vacancy-confirmations)$/.test(request.path??''))?'GET':request.path?.endsWith('/availability')?'PATCH':/\/privacy\/contact$/.test(request.path??'')?'GET, PUT, DELETE':/\/privacy\/media$/.test(request.path??'')?'GET, POST':/\/privacy\/media\/[0-9a-f-]{36}$/.test(request.path??'')?'DELETE':/\/privacy\//.test(request.path??'')?'GET':/\/units\/[0-9a-f-]{36}$/.test(request.path??'')?'PATCH':request.path?.endsWith('/map-settings')?'GET, POST':'POST');
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
