import {BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import {InventoryMutationSchema,OwnerVacancyHistoryPageSchema,vacancyTtlDays,type OwnerVacancyInput} from '@unihood/contracts';
import {UniversityRepository} from '../universities/university.repository';
import {BoardingInventoryService} from './boarding-inventory.service';
import {vacancyHistoryJson} from './boarding-vacancy.sql';
@Injectable()
export class BoardingVacancyService{
 constructor(private readonly repository:UniversityRepository,private readonly inventory:BoardingInventoryService){}
 async confirm(id:string,input:OwnerVacancyInput,actorId:string){const ttl=vacancyTtlDays(process.env.VACANCY_TTL_DAYS);if(ttl===null)throw new ServiceUnavailableException();if((input.expectedVacancyRevision===0)!==(input.reason==='INITIAL'))throw new BadRequestException();return this.repository.transaction(async query=>{
  await this.inventory.requireSyntheticOwnerProperty(query,id,true);
  const rows=await query('SELECT revision,vacancy_revision,capacity FROM public.boarding_units WHERE id=$1 AND boarding_id=$2 AND public_template IS NOT NULL FOR UPDATE',[input.unitId,id]);if(!rows.length)throw new NotFoundException();const unit=rows[0];if(unit.revision!==input.expectedUnitRevision||unit.vacancy_revision!==input.expectedVacancyRevision)throw new ConflictException();if(input.availableBeds!==null&&input.availableBeds>unit.capacity)throw new BadRequestException();
  await query(`INSERT INTO public.boarding_vacancy_confirmations(id,boarding_id,unit_id,revision,unit_revision,capacity_snapshot,status,available_beds,confirmed_at,expires_at,author_ref,change_reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+($9::int*INTERVAL '1 day'),$10,$11)`,[randomUUID(),id,input.unitId,input.expectedVacancyRevision+1,unit.revision,unit.capacity,input.status,input.availableBeds,ttl,actorId,input.reason]);await query('UPDATE public.boarding_units SET vacancy_revision=vacancy_revision+1 WHERE id=$1 AND boarding_id=$2',[input.unitId,id]);return InventoryMutationSchema.parse({id,unitId:input.unitId,synthetic:true});
 });}
 async history(id:string,unitId:string,input:{page?:string;pageSize?:string}){return this.repository.transaction(async query=>{await this.inventory.requireSyntheticOwnerProperty(query,id,true);const unit=await query('SELECT id FROM public.boarding_units WHERE id=$1 AND boarding_id=$2 AND public_template IS NOT NULL',[unitId,id]);if(!unit.length)throw new NotFoundException();const page=Number(input.page??1),pageSize=Number(input.pageSize??20);const rows=await query(`SELECT ${vacancyHistoryJson} AS payload FROM public.boarding_vacancy_confirmations c WHERE c.boarding_id=$1 AND c.unit_id=$2 ORDER BY c.revision DESC LIMIT $3 OFFSET $4`,[id,unitId,pageSize+1,(page-1)*pageSize]);return OwnerVacancyHistoryPageSchema.parse({items:rows.slice(0,pageSize).map(r=>r.payload),page:{page,pageSize,hasNextPage:rows.length>pageSize}});});}
}
