import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
// Called only after owning harness has verified its disposable tmpfs DB.
export async function testDuplicateApi(url){
 const probe=createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 const child=spawn(process.execPath,['apps/api/dist/main.js'],{stdio:'ignore',env:{...process.env,DATABASE_URL:url,APP_ENV:'test',NODE_ENV:'test',API_HOST:'127.0.0.1',API_PORT:String(port),WEB_PORT:'3180',ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:'contributor'}});
 const endpoint=`http://127.0.0.1:${port}`;
 try{
  for(let i=0;i<40;i++){try{if((await fetch(endpoint+'/health',{signal:AbortSignal.timeout(2000)})).ok)break;}catch{}if(i===39||child.exitCode!==null)throw new Error('Duplicate test API startup failed');await delay(250);}
  const input={kind:'POI',name:'Synthetic Lotus Pharmcy',category:'pharmacy',location:{lat:0,lng:0}};
  const post=(body,headers={})=>fetch(endpoint+'/api/v1/duplicates/check',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body),signal:AbortSignal.timeout(7000)});
  const preflight=await fetch(endpoint+'/api/v1/duplicates/check',{method:'OPTIONS',headers:{Origin:'http://127.0.0.1:3180','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),'http://127.0.0.1:3180');assert.equal(preflight.headers.get('access-control-allow-credentials'),null);
  const response=await post(input,{Origin:'http://127.0.0.1:3180'});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const result=await response.json();assert.equal(result.checkOnly,true);assert.equal(result.requiresReview,true);assert.ok(result.candidates.some(item=>item.name==='Synthetic Lotus Pharmacy'));assert.ok(!JSON.stringify(result).match(/boarding|private|latitude|longitude|"lat"|"lng"|contact/i));
  for(const body of [{...input,kind:'BOARDING'},{...input,buildingId:'53000000-0000-4000-8000-000000000001'},{...input,source:{provider:'synthetic-matcher',externalId:'private-boarding-id'}}])assert.equal((await post(body)).status,400);
  for(const headers of [{'X-Forwarded-For':'127.0.0.1'},{Origin:'https://evil.example'}])assert.equal((await post(input,headers)).status,401);
  console.log('PASS: contributing-actor HTTP → actual PostGIS duplicate candidates; loopback CORS, redacted public-only projection, residential/internal-field and forwarded/cross-site denials');
 }finally{if(child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},5000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}}
}
