import { BoardingDuplicateInputSchema, BoardingResolutionInputSchema } from '@unihood/contracts';
import { OwnerVisibilityPreviewInputSchema } from '@unihood/contracts';
// Test-only HTTP upstream. Never imported by runtime code or bundled in the app.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const graph = JSON.parse(await readFile(new URL('../../../infra/db/seeds/universities.synthetic.json', import.meta.url), 'utf8'));
const poiGraph=JSON.parse(await readFile(new URL('../../../infra/db/seeds/places.synthetic.json',import.meta.url),'utf8'));
const poiRows=poiGraph.places.map(row=>({id:row.id,kind:'POI',name:row.name,category:poiGraph.categories.find(c=>c.code===row.category),location:{lat:row.lat,lng:row.lng},provenance:{dataKind:'SYNTHETIC',sourceLabel:'UNI-021 synthetic fixture; not a real business or location',verifiedAt:null},lastConfirmedAt:null}));
const provenance = (row) => ({dataKind: row.data_kind, sourceLabel: row.source_label, verifiedAt: row.verified_at});
const universities = graph.universities.map((row) => ({id: row.id, slug: row.slug, name: row.name, city: row.city, country: row.country, provenance: provenance(row)}));
const campuses = graph.campuses.map((row) => ({id: row.id, universityId: row.university_id, name: row.name, publicArea: row.public_area, provenance: provenance(row)}));
const entrances = graph.entrances.map((row) => ({id: row.id, campusId: row.campus_id, name: row.name, location: {lat: row.lat, lng: row.lng}, isPrimary: row.is_primary, provenance: provenance(row)}));
const boardingFixtures=JSON.parse(await readFile(new URL('../../../infra/db/seeds/boardings.synthetic.json',import.meta.url),'utf8'));
const boardingRows=boardingFixtures.map(r=>({listing:{id:r.id,listingId:r.listingId,kind:'BOARDING',title:r.title,publisherKind:r.publisherKind,visibility:r.visibility,locationLabel:r.locality,entrance:null,distanceMeters:null,route:null,price:null,vacancy:{status:'UNKNOWN',confirmedAt:null,expiresAt:null},provenance:{dataKind:'SYNTHETIC',sourceLabel:'UNI-031 curated synthetic demonstration; no real property or owner',verifiedAt:null},...(r.publisherKind==='OWNER_OFFICIAL'?{ownerVerified:true}:{disclaimer:'Community-submitted, not owner-verified'})},summary:r.summary,updatedAt:'2026-11-17T00:00:00Z'}));
const proposalReceipts=new Map(); // Bounded synthetic test storage; not app runtime.
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  response.setHeader('Content-Type', 'application/json'); response.setHeader('Cache-Control', 'no-store');
  // Explicit synthetic owner-check mock: no authorization/database evidence.
  if(/^\/api\/v1\/owner\/boardings\/00000000-0000-4000-8000-000000000001\/(?:draft-check|visibility-preview)$/.test(url.pathname)){
    const origin=request.headers.origin;if(['http://127.0.0.1:3180','http://127.0.0.1:3181'].includes(origin)){response.setHeader('Access-Control-Allow-Origin',origin);response.setHeader('Access-Control-Allow-Headers','Content-Type');response.setHeader('Access-Control-Allow-Methods','POST');}
    if(request.method==='OPTIONS'){response.statusCode=204;response.end();return;}
    try{let body='';for await(const chunk of request){body+=chunk;if(body.length>4000)throw new Error();}const input=JSON.parse(body);
      if(url.pathname.endsWith('/visibility-preview')){const value=OwnerVisibilityPreviewInputSchema.parse(input);const common={id:'00000000-0000-4000-8000-000000000001',title:'Synthetic owner visibility preview',publisherKind:'OWNER_OFFICIAL',ownerVerified:true,price:null,vacancy:{status:'UNKNOWN',confirmedAt:null,expiresAt:null},visibility:value.visibility};const preview=value.visibility==='PUBLIC_MAP'?{...common,publicMapConsent:true,entrance:{lat:0,lng:0},locationLabel:null}:{...common,entrance:null,distanceMeters:null,route:null,locationLabel:value.visibility==='AREA_ONLY'?value.locality:null};response.end(JSON.stringify({outcome:'PREVIEW_ONLY',published:false,provenance:{dataKind:'SYNTHETIC',sourceLabel:'Synthetic browser preview fixture; not real data or authority',verifiedAt:null},preview}));return;}
      response.end(JSON.stringify({outcome:'DRAFT_ONLY',published:false,draft:input}));return;}catch{response.statusCode=400;response.end('{}');return;}
  }
  if(['/api/v1/contributions/boarding/duplicates','/api/v1/contributions/boarding/resolve'].includes(url.pathname)){
    const origin=request.headers.origin;if(['http://127.0.0.1:3180','http://127.0.0.1:3181'].includes(origin)){response.setHeader('Access-Control-Allow-Origin',origin);response.setHeader('Access-Control-Allow-Headers','Content-Type');response.setHeader('Access-Control-Allow-Methods','POST');}
    if(request.method==='OPTIONS'){response.statusCode=204;response.end();return;}
    try{let body='';for await(const chunk of request){body+=chunk;if(body.length>4000)throw new Error();}const input=JSON.parse(body);
      if(url.pathname.endsWith('/duplicates')){BoardingDuplicateInputSchema.parse(input);response.end(JSON.stringify({policyVersion:'boarding-ad-text-v1',candidates:[],hasMore:false,incomplete:false,requiresReview:true}));return;}
      const parsed=BoardingResolutionInputSchema.parse(input);response.end(JSON.stringify({contributionId:'40000000-0000-4000-8000-000000000040',outcome:'HELD_RECOMMENDATION',reviewState:parsed.resolution.kind==='EXISTING'?'PENDING':'NEEDS_EVIDENCE',publisherKind:'COMMUNITY_RECOMMENDATION',dataKind:'SYNTHETIC',published:false,resolution:parsed.resolution.kind==='EXISTING'?'ATTACHED_FOR_REVIEW':'REVIEW_REQUIRED',canonicalBoardingId:parsed.resolution.kind==='EXISTING'?parsed.resolution.boardingId:null}));return;
    }catch{response.statusCode=400;response.end('{}');return;}
  }
  if (url.searchParams.get('slug') === 'synthetic-unavailable') {response.statusCode = 503; response.end('{}'); return;}
  if(url.pathname==='/api/v1/places/proposals'){
    const origin=request.headers.origin;if(['http://127.0.0.1:3180','http://127.0.0.1:3181'].includes(origin)){response.setHeader('Access-Control-Allow-Origin',origin);response.setHeader('Access-Control-Allow-Headers','Content-Type');response.setHeader('Access-Control-Allow-Methods','POST');}
    if(request.method==='OPTIONS'){response.statusCode=204;response.end();return;}
    try{
      let body='';for await(const chunk of request){body+=chunk;if(body.length>10000)throw new Error();}const input=JSON.parse(body);
      if(proposalReceipts.size>=100&&!proposalReceipts.has(input.key)){response.statusCode=429;response.end('{}');return;}
      const prior=proposalReceipts.get(input.key);if(prior&&prior.body!==body){response.statusCode=409;response.end('{}');return;}
      const result=prior?.result??{outcome:'PENDING_REVIEW',proposalId:crypto.randomUUID(),requiresReview:true,reviewState:'PENDING'};
      proposalReceipts.set(input.key,{body,result});response.end(JSON.stringify(result));return;
    }catch{response.statusCode=400;response.end('{}');return;}
  }
  // Explicit synthetic browser upstream, not an authorization/matcher test.
  if(url.pathname==='/api/v1/duplicates/check'){
    const origin=request.headers.origin;
    if(['http://127.0.0.1:3180','http://127.0.0.1:3181'].includes(origin)){response.setHeader('Access-Control-Allow-Origin',origin);response.setHeader('Access-Control-Allow-Headers','Content-Type');response.setHeader('Access-Control-Allow-Methods','POST');}
    if(request.method==='OPTIONS'){response.statusCode=204;response.end();return;}
    response.end(JSON.stringify({checkOnly:true,policyVersion:'public-poi-v1',scope:'PUBLIC_POI_ONLY',candidates:[{id:poiRows[0].id,name:poiRows[0].name,category:'pharmacy',score:79,classification:'REVIEW_REQUIRED',signals:{nameSimilarity:1,normalizedNameExact:true,categoryMatch:true,withinRadius:true,sameBuilding:true,sourceMatch:false},requiresReview:true}],hasMore:false,incomplete:false,requiresReview:true}));return;
  }
  let rows;
  if(url.pathname==='/api/v1/boardings/map'){response.end(JSON.stringify({items:[],page:{page:Number(url.searchParams.get('page')??1),pageSize:Number(url.searchParams.get('pageSize')??20),hasNextPage:false}}));return;}
  if(url.pathname==='/api/v1/boardings/compare'){
    const ids=(url.searchParams.get('ids')??'').split(',').filter(Boolean);
    const items=ids.map(id=>{
      const isPublic = id === '71000000-0000-4000-8000-000000000010';
      const row = boardingRows.find(r=>r.listing.id===id);
      if(!row && !isPublic) return null;
      if(isPublic){
        return {
          id,
          title: 'Synthetic Consented Public Home',
          publisherKind: 'OWNER_OFFICIAL',
          visibility: 'PUBLIC_MAP',
          locationLabel: 'Synthetic Central Park',
          hasExactEntrance: true,
          entrance: { lat: 6.9012, lng: 79.8612 },
          price: {
            currency: 'LKR',
            rentMonthly: 20000,
            verifiedSource: 'OWNER',
          },
          vacancy: {
            status: 'AVAILABLE',
            confirmedAt: '2026-11-17T00:00:00Z',
            expiresAt: '2026-11-24T00:00:00Z'
          },
          unitsSummary: [
            {
              id: '75000000-0000-4000-8000-000000000001',
              label: 'Single Room',
              template: 'STUDY_ROOM',
              capacity: 1,
              rentMinor: 2000000,
              basis: 'BED',
              vacancyStatus: 'AVAILABLE'
            }
          ],
          nearbyEssentials: [
            { category: 'pharmacy', label: 'Pharmacy', count: 1, nearestDistanceMeters: 140 },
            { category: 'grocery', label: 'Grocery', count: 2, nearestDistanceMeters: 280 }
          ],
          summary: 'A public consented synthetic accommodation with exact entrance and nearby amenities.',
          updatedAt: '2026-11-18T00:00:00.000Z',
          provenance: { dataKind: 'SYNTHETIC', sourceLabel: 'UNI-038 synthetic demonstration; no real property or owner', verifiedAt: null }
        };
      }
      return {
        id: row.listing.id,
        title: row.listing.title,
        publisherKind: row.listing.publisherKind,
        visibility: row.listing.visibility,
        locationLabel: row.listing.locationLabel,
        hasExactEntrance: false,
        entrance: null,
        price: null,
        vacancy: row.listing.vacancy,
        unitsSummary: [],
        nearbyEssentials: null,
        summary: row.summary,
        updatedAt: '2026-11-18T00:00:00.000Z',
        provenance: row.listing.provenance
      };
    }).filter(Boolean);
    response.end(JSON.stringify({
      items,
      requestedCount: ids.length,
      comparedCount: items.length,
    }));return;
  }
  if(url.pathname.endsWith('/nearby-essentials')){
    const id=url.pathname.split('/')[4];
    if(id !== '71000000-0000-4000-8000-000000000010'){
      response.statusCode=404;
      response.end(JSON.stringify({error:{code:'NOT_FOUND',message:'The resource was not found.'}}));
      return;
    }
    response.end(JSON.stringify({
      boardingId: id,
      visibility: 'PUBLIC_MAP',
      entrance: { lat: 6.9012, lng: 79.8612 },
      items: [
        {
          id: '40000000-0000-4000-8000-000000000001',
          name: 'Synthetic Health Pharmacy',
          category: { code: 'pharmacy', label: 'Pharmacy' },
          location: { lat: 6.9015, lng: 79.8615 },
          distanceMeters: 140,
          provenance: { dataKind: 'SYNTHETIC', sourceLabel: 'Synthetic POI', verifiedAt: null }
        },
        {
          id: '40000000-0000-4000-8000-000000000002',
          name: 'Synthetic Community Grocer',
          category: { code: 'grocery', label: 'Grocery' },
          location: { lat: 6.9025, lng: 79.8625 },
          distanceMeters: 280,
          provenance: { dataKind: 'SYNTHETIC', sourceLabel: 'Synthetic POI', verifiedAt: null }
        }
      ]
    }));return;
  }
  if(url.pathname==='/api/v1/boardings'||url.pathname.startsWith('/api/v1/boardings/')){
    if(url.searchParams.get('q')==='synthetic-unavailable'){response.statusCode=503;response.end('{}');return;}
    const id=url.pathname.split('/')[4];
    if(id){if(id==='71000000-0000-4000-8000-000000000098'){response.statusCode=503;response.end('{}');return;}const row=boardingRows.find(r=>r.listing.id===id);if(!row){response.statusCode=404;response.end('{}');return;}response.end(JSON.stringify(row));return;}
    rows=boardingRows.filter(r=>(!url.searchParams.get('publisherKind')||r.listing.publisherKind===url.searchParams.get('publisherKind'))&&(!url.searchParams.get('visibility')||r.listing.visibility===url.searchParams.get('visibility'))&&(!url.searchParams.get('q')||(r.listing.title+' '+(r.listing.locationLabel??'')).toLowerCase().includes(url.searchParams.get('q').toLowerCase())));
    if(url.searchParams.get('sort')==='title')rows.sort((a,b)=>a.listing.title.localeCompare(b.listing.title));
    const page=Number(url.searchParams.get('page')??1),pageSize=Number(url.searchParams.get('pageSize')??12);response.end(JSON.stringify({items:rows.slice((page-1)*pageSize,page*pageSize),page:{page,pageSize,hasNextPage:rows.length>page*pageSize}}));return;
  }
  if(/^\/api\/v1\/places\/[^/]+$/.test(url.pathname)) {
    if(url.pathname.endsWith('/40000000-0000-4000-8000-000000000098')){response.statusCode=503;response.end(JSON.stringify({error:'PRIVATE_CANARY synthetic upstream failure'}));return;}
    const row=poiRows.find(row=>row.id===url.pathname.split('/').at(-1));
    if(!row){response.statusCode=404;response.end('{}');return;}
    response.end(JSON.stringify({...row,updatedAt:'2026-11-16T00:00:00Z'}));return;
  } else if(url.pathname==='/api/v1/places') {
    const [w,s,e,n]=(url.searchParams.get('bbox')??'').split(',').map(Number);
    rows=poiRows.filter(row=>row.location.lng>=w&&row.location.lng<=e&&row.location.lat>=s&&row.location.lat<=n&&(!url.searchParams.has('category')||row.category.code===url.searchParams.get('category'))&&(!url.searchParams.has('q')||row.name.toLowerCase().includes(url.searchParams.get('q').toLowerCase()))).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
  } else if(url.pathname==='/api/v1/place-categories') {response.end(JSON.stringify({items:poiGraph.categories,page:{page:1,pageSize:100,hasNextPage:false}}));return;}
  else if (url.pathname === '/api/v1/universities') rows = universities.filter((row) => !url.searchParams.has('slug') || row.slug === url.searchParams.get('slug'));
  else {
    const match = url.pathname.match(/^\/api\/v1\/universities\/([^/]+)\/(campuses|entrances)$/);
    if (!match || !universities.some((row) => row.id === match[1])) {response.statusCode = 404; response.end('{}'); return;}
    rows = match[2] === 'campuses' ? campuses.filter((row) => row.universityId === match[1]) : entrances.filter((row) => campuses.some((campus) => campus.universityId === match[1] && campus.id === row.campusId) && (!url.searchParams.has('campusId') || row.campusId === url.searchParams.get('campusId')));
  }
  const page = Number(url.searchParams.get('page') ?? 1), pageSize = Number(url.searchParams.get('pageSize') ?? 20);
  response.end(JSON.stringify({items: rows.slice((page - 1) * pageSize, page * pageSize), page: {page, pageSize, hasNextPage: rows.length > page * pageSize}}));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const children = [[process.env.UI_TEST_WEB_PORT ?? '3180', 'disabled'], [process.env.UI_TEST_MAP_PORT ?? '3181', 'openfreemap']].map(([webPort, provider]) => spawn(process.execPath, ['scripts/next.mjs', 'start'], {stdio: 'inherit', env: {...process.env, APP_ENV: process.env.APP_ENV ?? 'test', WEB_PORT: webPort, MAP_PROVIDER: provider, MAP_STYLE: 'liberty', API_BASE_URL: `http://127.0.0.1:${port}/api/v1`}}));
let closing = false;
const close = (signal = 'SIGTERM') => {if (closing) return; closing = true; for (const child of children) child.kill(signal); server.close();};
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => close(signal));
for (const child of children) child.once('exit', (code) => {if (!closing) {process.exitCode = code ?? 1; close();}});
