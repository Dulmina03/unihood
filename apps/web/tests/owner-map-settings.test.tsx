import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,expect,it,vi } from 'vitest';
import { OwnerMapSettings } from '../src/components/owner/map-settings';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('requires loaded authority state and explicit consent, sends minimal revision-safe changes and handles lost/conflicted requests honestly',async()=>{
 const current={id:'00000000-0000-4000-8000-000000000001',revision:1,visibility:'HIDDEN',locality:null,synthetic:true};
 const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(current)).mockResolvedValueOnce(Response.json({...current,revision:2,visibility:'PUBLIC_MAP'})).mockResolvedValueOnce(new Response('',{status:409}));vi.stubGlobal('fetch',fetcher);render(<OwnerMapSettings endpoint="http://127.0.0.1:3001/api/v1/owner/boardings/00000000-0000-4000-8000-000000000001/map-settings"/>);
 fireEvent.click(screen.getByRole('button',{name:'Load current settings'}));await screen.findByText('HIDDEN');fireEvent.click(screen.getByRole('button',{name:'Publish fictional public entrance'}));expect(fetcher).toHaveBeenCalledTimes(1);expect(screen.getByRole('alert')).toHaveTextContent('Choose the fictional entrance');
 fireEvent.change(screen.getByRole('combobox',{name:'Fictional entrance'}),{target:{value:'synthetic-courtyard-entrance'}});for(const box of screen.getAllByRole('checkbox'))fireEvent.click(box);fireEvent.click(screen.getByRole('button',{name:'Publish fictional public entrance'}));await screen.findByText('PUBLIC_MAP');expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({expectedRevision:1,choice:{visibility:'PUBLIC_MAP',entranceFixture:'synthetic-courtyard-entrance',publicMapConsent:true,externalCopiesAcknowledged:true}});
 fireEvent.click(screen.getByRole('button',{name:'Hide and revoke map consent'}));expect(await screen.findByRole('alert')).toHaveTextContent('Nothing is claimed as saved');expect(screen.queryByRole('button',{name:'Publish fictional public entrance'})).not.toBeInTheDocument();
});
