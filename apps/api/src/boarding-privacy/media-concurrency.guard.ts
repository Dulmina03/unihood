import {Injectable,HttpException,type CanActivate,type ExecutionContext} from '@nestjs/common';
import type {IncomingMessage,ServerResponse} from 'node:http';
@Injectable()
export class MediaConcurrencyGuard implements CanActivate{
 private active=0;
 canActivate(context:ExecutionContext){
  if(this.active>=2)throw new HttpException('Upload concurrency limit',429);
  this.active++;const response=context.switchToHttp().getResponse<ServerResponse>(),request=context.switchToHttp().getRequest<IncomingMessage>();let released=false;
  const timer=setTimeout(()=>request.destroy(),15000);
  const release=()=>{if(!released){released=true;this.active--;clearTimeout(timer);}};
  response.once('finish',release);response.once('close',release);return true;
 }
}
