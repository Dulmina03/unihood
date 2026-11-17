import {ConflictException,Inject,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import {MAX_MEDIA_ASSETS,MAX_MEDIA_BYTES,OwnerContactReceiptSchema,OwnerMediaPageSchema,OwnerMediaReceiptSchema,OwnerPrivacyEventPageSchema,OwnerPrivacyOverviewSchema,OwnerPrivateContactSchema,SYNTHETIC_PHONE,type OwnerPrivateContactInput} from '@unihood/contracts';
import {UniversityRepository} from '../universities/university.repository';
import {BoardingInventoryService} from '../boardings/boarding-inventory.service';
import {contactKey,decryptContact,encryptContact} from './contact-crypto';
import {PRIVATE_MEDIA_STORE,type PrivateMediaStore} from './private-media-store';
import {sanitizeImage} from './image-sanitizer';
type Query=Parameters<Parameters<UniversityRepository['transaction']>[0]>[0];
const date=(column:string)=>`to_char(${column} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
@Injectable()
export class BoardingPrivacyService{
 constructor(private readonly repository:UniversityRepository,private readonly inventory:BoardingInventoryService,@Inject(PRIVATE_MEDIA_STORE)private readonly store:PrivateMediaStore){}
 private async audit(query:Query,id:string,actorId:string,event:string,assetId:string|null=null){await query('INSERT INTO unihood_private.boarding_privacy_events(id,boarding_id,actor_ref,event_type,asset_ref) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,actorId,event,assetId]);}
 async overview(id:string){return this.repository.transaction(async query=>{await this.inventory.requireSyntheticOwnerProperty(query,id,true);return OwnerPrivacyOverviewSchema.parse({id,synthetic:true,maxBytes:MAX_MEDIA_BYTES,maxAssets:MAX_MEDIA_ASSETS,storageConfigured:this.store.configured(),encryptionConfigured:contactKey()!==null,scanner:'NOT_CONFIGURED',publicMediaDelivery:'DISABLED',publicContactDelivery:'DISABLED'});});}
 async media(id:string,input:{page?:string;pageSize?:string}){return this.repository.transaction(async query=>{
  await this.inventory.requireSyntheticOwnerProperty(query,id,true);const page=Number(input.page??1),pageSize=Number(input.pageSize??20);
  const rows=await query(`SELECT asset_id AS id,request_key,revision,state,cleanup_pending,bytes,width,height,${date('created_at')} AS created_at FROM unihood_private.boarding_media WHERE boarding_id=$1 ORDER BY created_at DESC,asset_id LIMIT $2 OFFSET $3`,[id,pageSize+1,(page-1)*pageSize]);
  return OwnerMediaPageSchema.parse({items:rows.slice(0,pageSize).map(r=>({id:r.id,requestKey:r.request_key,revision:r.revision,synthetic:true,state:r.state,previewAllowed:r.state==='ACTIVE',mime:'image/webp',bytes:r.bytes,width:r.width,height:r.height,consent:r.state==='REVOKED'?'REVOKED':'GRANTED',moderation:r.state==='REVOKED'?'REJECTED':'PENDING',metadata:'STRIPPED',cleanupPending:r.cleanup_pending,createdAt:r.created_at})),page:{page,pageSize,hasNextPage:rows.length>pageSize}});
 });}
 async upload(id:string,input:{requestKey:string;consent:'true'},file:{buffer:Buffer;mimetype:string},actorId:string){
  await this.repository.transaction(async query=>{await this.inventory.requireSyntheticOwnerProperty(query,id,true);});
  if(!this.store.configured())throw new ServiceUnavailableException();const image=await sanitizeImage(file.buffer,file.mimetype);let namespace:string;
  try{namespace=await this.store.prepare();}catch{throw new ServiceUnavailableException();}
  // Durable reservation before any file write: interrupted/ambiguous commits stay
  // reachable as private STAGING items, never untracked binaries or public assets.
  const reservation=await this.repository.transaction(async query=>{
   await this.inventory.requireSyntheticOwnerProperty(query,id,true);
   const prior=await query('SELECT asset_id,revision,state,checksum,storage_namespace FROM unihood_private.boarding_media WHERE boarding_id=$1 AND request_key=$2',[id,input.requestKey]);
   if(prior.length){if(prior[0].checksum!==image.checksum||prior[0].state==='REVOKED')throw new ConflictException();return prior[0];}
   const count=await query("SELECT count(*)::int AS n FROM unihood_private.boarding_media WHERE boarding_id=$1 AND state<>'REVOKED'",[id]);if(count[0].n>=MAX_MEDIA_ASSETS)throw new ConflictException();const assetId=randomUUID();
   await query('INSERT INTO unihood_private.boarding_media(asset_id,boarding_id,request_key,object_key,storage_namespace,checksum,bytes,width,height) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[assetId,id,input.requestKey,assetId+'.webp',namespace,image.checksum,image.buffer.length,image.width,image.height]);await this.audit(query,id,actorId,'MEDIA_UPLOAD_STAGED',assetId);return {asset_id:assetId,revision:1,state:'STAGING',checksum:image.checksum,storage_namespace:namespace};
  });
  return this.repository.transaction(async query=>{
   await this.inventory.requireSyntheticOwnerProperty(query,id,true);const rows=await query('SELECT asset_id,revision,state,object_key,storage_namespace,checksum FROM unihood_private.boarding_media WHERE boarding_id=$1 AND asset_id=$2 FOR UPDATE',[id,reservation.asset_id]);if(!rows.length)throw new NotFoundException();const row=rows[0];if(row.state==='REVOKED'||row.checksum!==image.checksum)throw new ConflictException();
   if(row.state==='STAGING'){
    if(row.object_key!==row.asset_id+'.webp')throw new ServiceUnavailableException();
    // The property lock serializes writing with consent withdrawal, preventing a
    // cancelled upload from recreating its file after deletion.
    try{await this.store.put(row.object_key,image.buffer,row.storage_namespace);}catch{throw new ServiceUnavailableException();}
    await query("INSERT INTO unihood_private.media_assets(id,object_key,uploader_ref,consent_status,moderation_status,metadata_status,mime,bytes,checksum,width,height) VALUES($1,$2,$3,'GRANTED','PENDING','STRIPPED','image/webp',$4,$5,$6,$7)",[row.asset_id,row.object_key,actorId,image.buffer.length,image.checksum,image.width,image.height]);
    await query("UPDATE unihood_private.boarding_media SET state='ACTIVE',retained_asset_id=asset_id,revision=revision+1 WHERE boarding_id=$1 AND asset_id=$2",[id,row.asset_id]);await this.audit(query,id,actorId,'MEDIA_QUARANTINED',row.asset_id);row.revision++;
   }
   return OwnerMediaReceiptSchema.parse({id,assetId:row.asset_id,revision:row.revision,synthetic:true,published:false,cleanupPending:false});
  });
 }
 async content(id:string,assetId:string){
  const row=await this.repository.transaction(async query=>{await this.inventory.requireSyntheticOwnerProperty(query,id,true);const rows=await query("SELECT m.object_key,m.storage_namespace FROM unihood_private.boarding_media m JOIN unihood_private.media_assets a ON a.id=m.asset_id WHERE m.boarding_id=$1 AND m.asset_id=$2 AND m.state='ACTIVE' AND a.consent_status='GRANTED' AND a.metadata_status='STRIPPED' AND a.moderation_status='PENDING'",[id,assetId]);if(!rows.length)throw new NotFoundException();return rows[0];});
  let buffer:Buffer;try{if(row.object_key!==assetId+'.webp')throw new Error();buffer=await this.store.read(row.object_key,row.storage_namespace);}catch{throw new ServiceUnavailableException();}
  // Revocation during file I/O cannot substitute a still-active owner preview.
  await this.repository.transaction(async query=>{await this.inventory.requireSyntheticOwnerProperty(query,id,true);const rows=await query("SELECT asset_id FROM unihood_private.boarding_media m JOIN unihood_private.media_assets a ON a.id=m.asset_id WHERE m.boarding_id=$1 AND m.asset_id=$2 AND m.state='ACTIVE' AND a.consent_status='GRANTED' AND a.metadata_status='STRIPPED' AND a.moderation_status='PENDING'",[id,assetId]);if(!rows.length)throw new NotFoundException();});return buffer;
 }
 async revokeMedia(id:string,assetId:string,revision:number,actorId:string){
  const row=await this.repository.transaction(async query=>{await this.inventory.requireSyntheticOwnerProperty(query,id,true);const rows=await query('SELECT revision,state,cleanup_pending,storage_namespace,object_key,retained_asset_id FROM unihood_private.boarding_media WHERE boarding_id=$1 AND asset_id=$2 FOR UPDATE',[id,assetId]);if(!rows.length)throw new NotFoundException();const row=rows[0];if(row.revision!==revision)throw new ConflictException();if(row.state!=='REVOKED'){await query("UPDATE unihood_private.boarding_media SET state='REVOKED',revision=revision+1,cleanup_pending=true WHERE boarding_id=$1 AND asset_id=$2",[id,assetId]);if(row.retained_asset_id)await query("UPDATE unihood_private.media_assets SET consent_status='REVOKED',moderation_status='REJECTED' WHERE id=$1",[assetId]);await this.audit(query,id,actorId,'MEDIA_CONSENT_REVOKED',assetId);row.revision++;row.cleanup_pending=true;}return row;});
  let pending=Boolean(row.cleanup_pending);if(pending){try{if(row.object_key!==assetId+'.webp')throw new Error();await this.store.remove(row.object_key,row.storage_namespace);await this.repository.query("UPDATE unihood_private.boarding_media SET cleanup_pending=false WHERE boarding_id=$1 AND asset_id=$2 AND state='REVOKED'",[id,assetId]);pending=false;}catch{/* Consent stays revoked even when physical cleanup needs a retry. */}}
  return OwnerMediaReceiptSchema.parse({id,assetId,revision:row.revision,synthetic:true,published:false,cleanupPending:pending});
 }
 async contact(id:string){return this.repository.transaction(async query=>{await this.inventory.requireSyntheticOwnerProperty(query,id,true);const rows=await query('SELECT revision,state,ciphertext,iv,auth_tag,public_consent FROM unihood_private.boarding_contacts WHERE boarding_id=$1',[id]);const row=rows[0],key=contactKey();let masked:null|'•••0100'=null,readable=row?.state!=='PRIVATE';
  if(row?.state==='PRIVATE'&&key){try{if(decryptContact({ciphertext:row.ciphertext,iv:row.iv,tag:row.auth_tag},id,row.revision,key)!==SYNTHETIC_PHONE)throw new Error();masked='•••0100';readable=true;}catch{readable=false;}}
  return OwnerPrivateContactSchema.parse({id,synthetic:true,revision:row?.revision??0,state:row?.state??'ABSENT',maskedPhone:masked,publicConsent:row?.public_consent??false,verification:'UNVERIFIED',publicAvailable:false,encryptionConfigured:key!==null,readable});
 });}
 async setContact(id:string,input:OwnerPrivateContactInput,actorId:string){const key=contactKey();if(!key)throw new ServiceUnavailableException();return this.repository.transaction(async query=>{await this.inventory.requireSyntheticOwnerProperty(query,id,true);const rows=await query('SELECT revision FROM unihood_private.boarding_contacts WHERE boarding_id=$1 FOR UPDATE',[id]);if((rows[0]?.revision??0)!==input.expectedRevision)throw new ConflictException();const revision=input.expectedRevision+1,value=encryptContact(SYNTHETIC_PHONE,id,revision,key);
  await query("INSERT INTO unihood_private.boarding_contacts(boarding_id,revision,state,ciphertext,iv,auth_tag,key_version,public_consent) VALUES($1,$2,'PRIVATE',$3,$4,$5,'LOCAL_TEST_V1',$6) ON CONFLICT(boarding_id) DO UPDATE SET revision=EXCLUDED.revision,state='PRIVATE',ciphertext=EXCLUDED.ciphertext,iv=EXCLUDED.iv,auth_tag=EXCLUDED.auth_tag,key_version=EXCLUDED.key_version,public_consent=EXCLUDED.public_consent,updated_at=CURRENT_TIMESTAMP",[id,revision,value.ciphertext,value.iv,value.tag,input.publicConsent]);await this.audit(query,id,actorId,'PRIVATE_CONTACT_SET');return OwnerContactReceiptSchema.parse({id,revision,synthetic:true,publicAvailable:false});
 });}
 async removeContact(id:string,revision:number,actorId:string){return this.repository.transaction(async query=>{await this.inventory.requireSyntheticOwnerProperty(query,id,true);const rows=await query('SELECT revision,state FROM unihood_private.boarding_contacts WHERE boarding_id=$1 FOR UPDATE',[id]);if(!rows.length)throw new NotFoundException();const row=rows[0];if(row.revision!==revision)throw new ConflictException();if(row.state!=='REMOVED'){await query("UPDATE unihood_private.boarding_contacts SET state='REMOVED',revision=revision+1,ciphertext=NULL,iv=NULL,auth_tag=NULL,key_version=NULL,public_consent=false,updated_at=CURRENT_TIMESTAMP WHERE boarding_id=$1",[id]);await this.audit(query,id,actorId,'PRIVATE_CONTACT_REMOVED');row.revision++;}return OwnerContactReceiptSchema.parse({id,revision:row.revision,synthetic:true,publicAvailable:false});});}
 async events(id:string,input:{page?:string;pageSize?:string}){return this.repository.transaction(async query=>{await this.inventory.requireSyntheticOwnerProperty(query,id,true);const page=Number(input.page??1),pageSize=Number(input.pageSize??20);const rows=await query(`SELECT id,event_type,asset_ref,${date('occurred_at')} AS occurred_at FROM unihood_private.boarding_privacy_events WHERE boarding_id=$1 ORDER BY occurred_at DESC,id DESC LIMIT $2 OFFSET $3`,[id,pageSize+1,(page-1)*pageSize]);return OwnerPrivacyEventPageSchema.parse({items:rows.slice(0,pageSize).map(r=>({id:r.id,event:r.event_type,assetId:r.asset_ref,occurredAt:r.occurred_at})),page:{page,pageSize,hasNextPage:rows.length>pageSize}});});}
}
