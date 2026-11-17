// This URL is public connection information, never a credential or actor token.
// Direct browser requests preserve the API's socket/origin/forwarding checks.
export function duplicateEndpoint(env:Readonly<Record<string,string|undefined>>):string|null{
  if(!['local','test'].includes(env.APP_ENV??''))return null;
  try{
    const base=new URL(env.API_BASE_URL??env.NEXT_PUBLIC_API_URL??'http://127.0.0.1:3001/api/v1');
    if(base.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(base.hostname)||base.username||base.password||base.search||base.hash)return null;
    return `${base.origin}${base.pathname.replace(/\/$/,'')}/duplicates/check`;
  }catch{return null;}
}
