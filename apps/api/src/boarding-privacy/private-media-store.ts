import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {lstat,mkdir,open,readdir,realpath,unlink,type FileHandle} from 'node:fs/promises';
import {isAbsolute,join,parse,sep} from 'node:path';
import {MAX_MEDIA_BYTES} from '@unihood/contracts';
export const PRIVATE_MEDIA_STORE=Symbol('unihood:private-media-store');
export interface PrivateMediaStore{
 configured():boolean;
 prepare():Promise<string>;
 put(key:string,buffer:Buffer,namespace:string):Promise<void>;
 read(key:string,namespace:string):Promise<Buffer>;
 remove(key:string,namespace:string):Promise<void>;
}
function localMode(){return (process.env.APP_ENV==='local'&&(!process.env.NODE_ENV||process.env.NODE_ENV==='development'))||(process.env.APP_ENV==='test'&&process.env.NODE_ENV==='test');}
function missing(error:unknown){return Boolean(error&&typeof error==='object'&&'code' in error&&error.code==='ENOENT');}
export class LocalPrivateMediaStore implements PrivateMediaStore{
 private readonly root=localMode()?process.env.MEDIA_STORAGE_ROOT:null;
 configured(){return Boolean(this.root&&isAbsolute(this.root)&&this.root!==parse(this.root).root&&!this.root.split(sep).some(p=>['public','.git','.next','node_modules'].includes(p)));}
 private async directory(create=false){
  if(!this.configured()||!this.root)throw new Error('Private storage unavailable');
  if(create)await mkdir(this.root,{recursive:true,mode:0o700});
  const stat=await lstat(this.root);if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)!==0||(process.getuid&&stat.uid!==process.getuid()))throw new Error('Private storage unavailable');
  const root=await realpath(this.root);if(root.split(sep).some(p=>['public','.git','.next','node_modules'].includes(p)))throw new Error('Private storage unavailable');
  return {root,namespace:createHash('sha256').update(root).digest('hex')};
 }
 private validateKey(key:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/.test(key))throw new Error('Private storage unavailable');}
 async prepare(){return (await this.directory(true)).namespace;}
 async put(key:string,buffer:Buffer,namespace:string){
  this.validateKey(key);if(!buffer.length||buffer.length>MAX_MEDIA_BYTES)throw new Error('Private storage unavailable');const current=await this.directory();if(current.namespace!==namespace)throw new Error('Private storage unavailable');
  let file:FileHandle;try{if((await readdir(current.root)).length>=40){const existing=await this.read(key,namespace);if(!existing.equals(buffer))throw new Error('Private quarantine capacity reached');return;}file=await open(join(current.root,key),'wx',0o600);}catch(error){if(error&&typeof error==='object'&&'code' in error&&error.code==='EEXIST'){const existing=await this.read(key,namespace);if(!existing.equals(buffer))throw new Error('Private stored image mismatch');return;}throw error;}
  try{await file.writeFile(buffer);await file.sync();}finally{await file.close();}
  const directory=await open(current.root,constants.O_RDONLY);try{await directory.sync();}finally{await directory.close();}
 }
 async read(key:string,namespace:string){this.validateKey(key);const current=await this.directory();if(current.namespace!==namespace)throw new Error('Private storage unavailable');const file=await open(join(current.root,key),constants.O_RDONLY|constants.O_NOFOLLOW);try{const stat=await file.stat();if(!stat.isFile()||stat.size<1||stat.size>MAX_MEDIA_BYTES||(stat.mode&0o077)!==0)throw new Error('Private storage unavailable');return await file.readFile();}finally{await file.close();}}
 async remove(key:string,namespace:string){this.validateKey(key);const current=await this.directory();if(current.namespace!==namespace)throw new Error('Private storage unavailable');try{await unlink(join(current.root,key));}catch(error){if(!missing(error))throw error;}}
}
