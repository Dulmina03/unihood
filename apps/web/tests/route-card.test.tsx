import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouteCard } from '../src/components/boardings/route-card';
import { PedestrianRouteSegmentsResultUnion, PedestrianRouteObservationsResultUnion } from '@unihood/contracts';

const gateId='30000000-0000-4000-8000-000000000001';
const boardingId='00000000-0000-4000-8000-000000000001';

const segmentsAvailable=(timeContext='DAY')=>PedestrianRouteSegmentsResultUnion.parse({
  status:'AVAILABLE',gateId,boardingId,timeContext,providerId:'LOCAL_FIXTURE',sourceVersion:'uni-053-synthetic-segments-v1',
  segments:[{segmentId:'seg-1',routeId:'route-1',geometry:{type:'LineString',coordinates:[[0,0],[0.0002,0.0002]]},distanceMeters:56,durationSeconds:48,conditions:[{type:'LIGHTING',status:'GOOD' as const,confidence:'SOURCE_CHECKED' as const,source:'uni-053-synthetic-segment-day-lighting'},{type:'FOOTPATH',status:'POOR' as const,confidence:'COMMUNITY_SUBMITTED' as const,source:'uni-053-synthetic-segment-day-footpath'}],source:'uni-053-synthetic-segment-day-source',confidence:'SOURCE_CHECKED' as const,timeContext}]});
const observationsAvailable=(timeContext='DAY')=>PedestrianRouteObservationsResultUnion.parse({
  status:'AVAILABLE',gateId,boardingId,timeContext,providerId:'LOCAL_FIXTURE',sourceVersion:'uni-053-synthetic-observations-v1',
  observations:[{observationId:'obs-1',routeId:'route-1',timeContext,observedAt:'2026-11-20T10:00:00Z',segments:[{segmentId:'seg-1',routeId:'route-1',geometry:{type:'LineString',coordinates:[[0,0],[0.0002,0.0002]]},distanceMeters:56,durationSeconds:48,conditions:[{type:'LIGHTING',status:'GOOD' as const,confidence:'SOURCE_CHECKED' as const,source:'uni-053-synthetic-observation-day-lighting'}],source:'uni-053-synthetic-observation-day-source',confidence:'SOURCE_CHECKED' as const,timeContext}],overallNote:'Daytime synthetic observation; path well-lit and clear',source:'uni-053-synthetic-observation-day-source',confidence:'SOURCE_CHECKED' as const}]});
const segmentsUnavailable=(reason='NO_ROUTE')=>PedestrianRouteSegmentsResultUnion.parse({status:'UNAVAILABLE',gateId,boardingId,timeContext:'DAY',providerId:'LOCAL_FIXTURE',reason});
const observationsUnavailable=(reason='NO_ROUTE')=>PedestrianRouteObservationsResultUnion.parse({status:'UNAVAILABLE',gateId,boardingId,timeContext:'DAY',providerId:'LOCAL_FIXTURE',reason});

const makeFetch=(segmentsData:unknown,observationsData:unknown)=>{
  const fetcher=vi.fn<typeof fetch>((url:RequestInfo | URL)=>{
    const u=String(url);
    if(u.includes('/segments'))return Promise.resolve({ok:true,json:async()=>segmentsData} as Response);
    if(u.includes('/observations'))return Promise.resolve({ok:true,json:async()=>observationsData} as Response);
    return Promise.resolve({ok:false,status:404} as Response);
  });
  vi.spyOn(globalThis,'fetch').mockImplementation(fetcher);
  return fetcher;
};

afterEach(()=>{cleanup();vi.restoreAllMocks();});

describe('RouteCard Component',()=>{
  it('renders synthetic provenance and no safety language',async()=>{
    makeFetch(segmentsAvailable(),observationsAvailable());
    render(<RouteCard gateId={gateId} boardingId={boardingId} timeContext="DAY" />);
    await waitFor(()=>expect(screen.getByText(/Illustrative synthetic route observations — not a safety assessment/)).toBeDefined());
    expect(screen.queryByText(/this route is safe|safest route|safety grade|safety score/i)).toBeNull();
  });
  it('displays segment conditions with GOOD/POOR/UNKNOWN statuses',async()=>{
    makeFetch(segmentsAvailable(),observationsAvailable());
    render(<RouteCard gateId={gateId} boardingId={boardingId} timeContext="DAY" />);
    await waitFor(()=>expect(screen.getAllByText('Lighting').length).toBeGreaterThanOrEqual(1));
    await waitFor(()=>expect(screen.getAllByText('GOOD').length).toBeGreaterThanOrEqual(1));
    await waitFor(()=>expect(screen.getByText('Footpath')).toBeDefined());
    await waitFor(()=>expect(screen.getByText('POOR')).toBeDefined());
  });
  it('shows loading state before data arrives',async()=>{
    vi.spyOn(globalThis,'fetch').mockImplementation(()=>new Promise(()=>{}));
    render(<RouteCard gateId={gateId} boardingId={boardingId} timeContext="DAY" />);
    expect(screen.getByText(/Loading route conditions/)).toBeDefined();
  });
  it('shows NO_ROUTE unavailable state when both are unavailable',async()=>{
    makeFetch(segmentsUnavailable('NO_ROUTE'),observationsUnavailable('NO_ROUTE'));
    render(<RouteCard gateId={gateId} boardingId={boardingId} timeContext="DAY" />);
    await waitFor(()=>expect(screen.getByText(/No walking route was found/)).toBeDefined());
    expect(screen.getByText(/Route conditions unavailable/)).toBeDefined();
  });
  it('shows UNSUPPORTED_TIME_CONTEXT unavailable state',async()=>{
    makeFetch(segmentsUnavailable('UNSUPPORTED_TIME_CONTEXT'),observationsUnavailable('UNSUPPORTED_TIME_CONTEXT'));
    render(<RouteCard gateId={gateId} boardingId={boardingId} timeContext="NIGHT" />);
    await waitFor(()=>expect(screen.getByText(/The selected time context is not supported/)).toBeDefined());
  });
  it('shows provider unavailable error',async()=>{
    vi.spyOn(globalThis,'fetch').mockResolvedValue({ok:false,status:503} as Response);
    render(<RouteCard gateId={gateId} boardingId={boardingId} timeContext="DAY" />);
    await waitFor(()=>expect(screen.getByText(/Route conditions unavailable/)).toBeDefined());
  });
  it('handles malformed API responses as errors',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue({ok:true,json:async()=>({status:'AVAILABLE'})} as Response);
    vi.spyOn(globalThis,'fetch').mockImplementation(fetcher);
    render(<RouteCard gateId={gateId} boardingId={boardingId} timeContext="DAY" />);
    await waitFor(()=>expect(screen.getByText(/Route conditions unavailable/)).toBeDefined());
  });
  it('switches between day and night time contexts',async()=>{
    makeFetch(segmentsAvailable('DAY'),observationsAvailable('DAY'));
    render(<RouteCard gateId={gateId} boardingId={boardingId} timeContext="DAY" />);
    await waitFor(()=>expect(screen.getAllByText('Lighting').length).toBeGreaterThanOrEqual(1));
    fireEvent.click(screen.getByText('Night'));
    await waitFor(()=>expect(screen.getByText(/Loading route conditions/)).toBeDefined());
  });
  it('prevents stale responses from overwriting newer selections',async()=>{
    let firstResolve!: (r:Response)=>void;
    const fetcher=vi.fn<typeof fetch>()
      .mockImplementationOnce(()=>new Promise(r=>{firstResolve=r;}))
      .mockResolvedValueOnce(Response.json(segmentsAvailable('DAY')))
      .mockResolvedValueOnce(Response.json(observationsAvailable('DAY')));
    vi.spyOn(globalThis,'fetch').mockImplementation(fetcher);
    render(<RouteCard gateId={gateId} boardingId={boardingId} timeContext="DAY" />);
    fireEvent.click(screen.getByText('Night'));
    await firstResolve(Response.json(segmentsAvailable('DAY')));
    await waitFor(()=>expect(screen.getByText(/Loading route conditions/)).toBeDefined());
  });
  it('includes synthetic source labeling',async()=>{
    makeFetch(segmentsAvailable(),observationsAvailable());
    render(<RouteCard gateId={gateId} boardingId={boardingId} timeContext="DAY" />);
    await waitFor(()=>expect(screen.getAllByText(/uni-053-synthetic/).length).toBeGreaterThanOrEqual(1));
  });
  it('renders confidence and source for conditions',async()=>{
    makeFetch(segmentsAvailable(),observationsAvailable());
    render(<RouteCard gateId={gateId} boardingId={boardingId} timeContext="DAY" />);
    await waitFor(()=>expect(screen.getAllByText('SOURCE_CHECKED').length).toBeGreaterThanOrEqual(1));
    await waitFor(()=>expect(screen.getAllByText(/uni-053-synthetic-segment-day-lighting/).length).toBeGreaterThanOrEqual(1));
  });
  it('renders observation overall note',async()=>{
    makeFetch(segmentsAvailable(),observationsAvailable());
    render(<RouteCard gateId={gateId} boardingId={boardingId} timeContext="DAY" />);
    await waitFor(()=>expect(screen.getByText(/Daytime synthetic observation/)).toBeDefined());
  });
  it('does not render when identifiers are missing',()=>{
    render(<RouteCard gateId={''} boardingId={boardingId} timeContext="DAY" />);
    expect(screen.queryByText(/Walking route conditions/)).toBeNull();
  });
  it('has accessible day/night selector',async()=>{
    makeFetch(segmentsAvailable(),observationsAvailable());
    render(<RouteCard gateId={gateId} boardingId={boardingId} timeContext="DAY" />);
    await waitFor(()=>expect(screen.getAllByText('Lighting').length).toBeGreaterThanOrEqual(1));
    const nightChip=screen.getByText('Night');
    expect(nightChip).toBeInTheDocument();
    fireEvent.click(nightChip);
    await waitFor(()=>expect(screen.getByText(/Loading route conditions/)).toBeDefined());
  });
});
