import { describe,it,expect,vi,afterEach } from 'vitest';
import { GET as getSegments } from '../src/app/api/routes/segments/route';
import { GET as getObservations } from '../src/app/api/routes/observations/route';
import { PedestrianRouteSegmentsResultUnion, PedestrianRouteObservationsResultUnion } from '@unihood/contracts';

const gateId='30000000-0000-4000-8000-000000000001';
const boardingId='00000000-0000-4000-8000-000000000001';

const segmentsAvailable=(timeContext='DAY')=>PedestrianRouteSegmentsResultUnion.parse({
  status:'AVAILABLE',gateId,boardingId,timeContext,providerId:'LOCAL_FIXTURE',sourceVersion:'uni-053-synthetic-segments-v1',
  segments:[{segmentId:'seg-1',routeId:'route-1',geometry:{type:'LineString',coordinates:[[0,0],[0.0002,0.0002]]},distanceMeters:56,durationSeconds:48,conditions:[{type:'LIGHTING',status:'GOOD' as const,confidence:'SOURCE_CHECKED' as const,source:'uni-053-synthetic-segment-day-lighting'}],source:'uni-053-synthetic-segment-day-source',confidence:'SOURCE_CHECKED' as const,timeContext}]});
const observationsAvailable=(timeContext='DAY')=>PedestrianRouteObservationsResultUnion.parse({
  status:'AVAILABLE',gateId,boardingId,timeContext,providerId:'LOCAL_FIXTURE',sourceVersion:'uni-053-synthetic-observations-v1',
  observations:[{observationId:'obs-1',routeId:'route-1',timeContext,observedAt:'2026-11-20T10:00:00Z',segments:[{segmentId:'seg-1',routeId:'route-1',geometry:{type:'LineString',coordinates:[[0,0],[0.0002,0.0002]]},distanceMeters:56,durationSeconds:48,conditions:[{type:'LIGHTING',status:'GOOD' as const,confidence:'SOURCE_CHECKED' as const,source:'uni-053-synthetic-observation-day-lighting'}],source:'uni-053-synthetic-observation-day-source',confidence:'SOURCE_CHECKED' as const,timeContext}],overallNote:'Daytime synthetic observation; path well-lit and clear',source:'uni-053-synthetic-observation-day-source',confidence:'SOURCE_CHECKED' as const}]});
const segmentsUnavailable=(reason='NO_ROUTE')=>PedestrianRouteSegmentsResultUnion.parse({status:'UNAVAILABLE',gateId,boardingId,timeContext:'DAY',providerId:'LOCAL_FIXTURE',reason});
const observationsUnavailable=(reason='NO_ROUTE')=>PedestrianRouteObservationsResultUnion.parse({status:'UNAVAILABLE',gateId,boardingId,timeContext:'DAY',providerId:'LOCAL_FIXTURE',reason});

const req=(path:string)=>new Request('http://local.invalid'+path);

afterEach(()=>{vi.restoreAllMocks();});

const mockFetch=(data:unknown)=>vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json(data));

describe('Route segments API proxy',()=>{
  it('forwards validated segments request and returns parsed result',async()=>{
    const fetcher=mockFetch(segmentsAvailable());
    const response=await getSegments(req('/api/routes/segments?gateId='+gateId+'&boardingId='+boardingId+'&timeContext=DAY'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body=await response.json();
    expect(body.status).toBe('AVAILABLE');
    expect(body.segments[0].conditions[0].type).toBe('LIGHTING');
    expect(String(fetcher.mock.calls[0][0])).toContain('/api/v1/routes/segments');
    expect(String(fetcher.mock.calls[0][0])).toContain('gateId='+gateId);
    expect(JSON.stringify(fetcher.mock.calls[0])).not.toContain('Authorization');
  });
  it('rejects invalid segments query before network I/O',async()=>{
    const fetcher=vi.fn<typeof fetch>();
    vi.spyOn(globalThis,'fetch').mockImplementation(fetcher);
    for(const q of ['', '/api/routes/segments?gateId='+gateId, '/api/routes/segments?gateId='+gateId+'&boardingId='+boardingId+'&timeContext=INVALID', '/api/routes/segments?gateId=not-a-uuid&boardingId='+boardingId+'&timeContext=DAY']){
      const response=await getSegments(req(q));
      expect(response.status).toBe(400);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('redacts upstream errors as 503 without leaking internals',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockRejectedValue(new Error('PRIVATE_CANARY'));
    vi.spyOn(globalThis,'fetch').mockImplementation(fetcher);
    const response=await getSegments(req('/api/routes/segments?gateId='+gateId+'&boardingId='+boardingId+'&timeContext=DAY'));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('PRIVATE_CANARY');
  });
  it('returns typed unavailable segments result',async()=>{
    mockFetch(segmentsUnavailable('NO_ROUTE'));
    const response=await getSegments(req('/api/routes/segments?gateId='+gateId+'&boardingId='+boardingId+'&timeContext=DAY'));
    const body=await response.json();
    expect(body.status).toBe('UNAVAILABLE');
    expect(body.reason).toBe('NO_ROUTE');
  });
});

describe('Route observations API proxy',()=>{
  it('forwards validated observations request and returns parsed result',async()=>{
    const fetcher=mockFetch(observationsAvailable());
    const response=await getObservations(req('/api/routes/observations?gateId='+gateId+'&boardingId='+boardingId+'&timeContext=DAY'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body=await response.json();
    expect(body.status).toBe('AVAILABLE');
    expect(body.observations[0].overallNote).toContain('Daytime');
    expect(String(fetcher.mock.calls[0][0])).toContain('/api/v1/routes/observations');
    expect(JSON.stringify(fetcher.mock.calls[0])).not.toContain('Authorization');
  });
  it('rejects invalid observations query before network I/O',async()=>{
    const fetcher=vi.fn<typeof fetch>();
    vi.spyOn(globalThis,'fetch').mockImplementation(fetcher);
    for(const q of ['', '/api/routes/observations?gateId='+gateId, '/api/routes/observations?gateId='+gateId+'&boardingId='+boardingId+'&timeContext=INVALID']){
      const response=await getObservations(req(q));
      expect(response.status).toBe(400);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('redacts upstream errors as 503 without leaking internals',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockRejectedValue(new Error('PRIVATE_CANARY'));
    vi.spyOn(globalThis,'fetch').mockImplementation(fetcher);
    const response=await getObservations(req('/api/routes/observations?gateId='+gateId+'&boardingId='+boardingId+'&timeContext=DAY'));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('PRIVATE_CANARY');
  });
  it('returns typed unavailable observations result',async()=>{
    mockFetch(observationsUnavailable('UNSUPPORTED_TIME_CONTEXT'));
    const response=await getObservations(req('/api/routes/observations?gateId='+gateId+'&boardingId='+boardingId+'&timeContext=NIGHT'));
    const body=await response.json();
    expect(body.status).toBe('UNAVAILABLE');
    expect(body.reason).toBe('UNSUPPORTED_TIME_CONTEXT');
  });
});
