import { Body, Controller, Header, HttpCode, HttpException, Injectable, Post, ServiceUnavailableException, UseGuards, type CanActivate } from '@nestjs/common';
import { DuplicateCheckInputSchema, DuplicateCheckResultSchema } from '@unihood/contracts';
import { RequirePermission } from '../identity/protected-boundary.guard';
import { ContractValidationPipe } from '../http/contract-validation.pipe';
import { ApiContract } from '../openapi/operation';
import { PoiMatcherService } from './poi-matcher.service';
@Injectable()
export class DuplicateRateGuard implements CanActivate {
  // Single-process loopback simulator: shared budget, no spoofable IP key or
  // unbounded identity map. Deployed callers fail the global actor guard first.
  private started=0; private count=0;
  canActivate() {
    const now=Date.now(); if(now-this.started>=60000){this.started=now;this.count=0;}
    if(++this.count>20)throw new HttpException('Rate limit',429);
    return true;
  }
}
@Controller('api/v1/duplicates')
export class DuplicateController {
  private active=0;
  constructor(private readonly matcher:PoiMatcherService){}
  @Post('check') @HttpCode(200) @Header('Cache-Control','no-store')
  @RequirePermission({action:'suggest'}) @UseGuards(DuplicateRateGuard)
  @ApiContract({summary:'Contributing-actor public POI preflight only; never creates, merges or clears publication',bodySchema:'DuplicateCheckInput',protected:true,responses:{
    '200':{schema:'DuplicateCheckResult',description:'Bounded review candidates, not verified identity; final transactional recheck still required'},
    '400':{schema:'ErrorResponse',description:'Invalid public POI input'},'401':{schema:'ErrorResponse',description:'No contributing actor; deployed access denied until final authentication'},
    '403':{schema:'ErrorResponse',description:'Actor cannot contribute'},'429':{schema:'ErrorResponse',description:'Shared local simulator budget: 20 checks per minute, three active checks'},
    '500':{schema:'ErrorResponse',description:'Internal error'},'503':{schema:'ErrorResponse',description:'Candidate check unavailable'}}})
  async check(@Body(new ContractValidationPipe(DuplicateCheckInputSchema)) input:unknown){
    if(this.active>=3)throw new HttpException('Rate limit',429);
    this.active++;
    try{return DuplicateCheckResultSchema.parse({...await this.matcher.match(input),checkOnly:true});}
    catch {throw new ServiceUnavailableException();}
    finally{this.active--;}
  }
}
