import { syntheticConfig } from '../identity/synthetic-actors';
// Browser talks directly to the loopback API: never promote a proxied public
// request into a synthetic actor. No credentialed CORS, wildcard or public host.
export function localDuplicateOrigin(origin:unknown, env:NodeJS.ProcessEnv=process.env){
  if(!syntheticConfig(env).enabled || typeof origin!=='string')return false;
  try{const url=new URL(origin);return url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&url.port===String(env.WEB_PORT??3000)&&url.origin===origin;}catch{return false;}
}
