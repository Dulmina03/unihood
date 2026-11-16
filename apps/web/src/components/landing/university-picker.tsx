'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UniversityPageSchema, CampusPageSchema, CampusEntrancePageSchema, UniversitySchema, type RuntimeSchema } from '@unihood/contracts';
import { en } from '../../lib/i18n/en';
import { Badge, Button, Field, Icon, Notice } from '@unihood/ui';
type University = ReturnType<typeof UniversitySchema.parse>;
type CampusPage = ReturnType<typeof CampusPageSchema.parse>;
type EntrancePage = ReturnType<typeof CampusEntrancePageSchema.parse>;
type Page = ReturnType<typeof UniversityPageSchema.parse>;
function usePage<T>(url: string | null, schema: RuntimeSchema<T>) {
  const [retry, setRetry] = useState(0);
  const key = `${url}:${retry}`;
  const [state, setState] = useState<{key: string; data?: T; failed?: boolean}>({key: ''});
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let active = true;
    fetch(url, {signal: controller.signal, cache: 'no-store', credentials: 'omit'}).then(async (response) => {
      if (!response.ok) throw new Error('Unavailable');
      const data = schema.parse(await response.json());
      if (active) setState({key, data});
    }).catch(() => {if (active) setState({key, failed: true});}).finally(() => clearTimeout(timeout));
    return () => {active = false; clearTimeout(timeout); controller.abort();};
  }, [url, schema, key]);
  return {data: state.key === key ? state.data : undefined, failed: state.key === key && state.failed,
    loading: Boolean(url) && (state.key !== key || (!state.data && !state.failed)), retry: () => setRetry((value) => value + 1)};
}
export function UniversityPicker({university}: {university?: University}) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const directory = usePage<Page>(`/api/universities?page=${page}&pageSize=100`, UniversityPageSchema);
  const [chosen, setChosen] = useState<University | undefined>(university);
  const [filter, setFilter] = useState('');
  const [campusId, setCampusId] = useState('');
  const [entranceId, setEntranceId] = useState('');
  const [campusPage, setCampusPage] = useState(1);
  const [entrancePage, setEntrancePage] = useState(1);
  const campuses = usePage<CampusPage>(chosen ? `/api/universities/${chosen.id}/campuses?page=${campusPage}&pageSize=100` : null, CampusPageSchema);
  const entrances = usePage<EntrancePage>(chosen && campusId ? `/api/universities/${chosen.id}/entrances?campusId=${campusId}&page=${entrancePage}&pageSize=100` : null, CampusEntrancePageSchema);
  const all = directory.data?.items ?? [];
  const visible = all.filter((item) => item.name.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase()));
  const options = chosen && !visible.some((item) => item.id === chosen.id) ? [chosen, ...visible] : visible;
  const selectedCampus = campuses.data?.items.find((item) => item.id === campusId && item.universityId === chosen?.id);
  const selectedEntrance = entrances.data?.items.find((item) => item.id === entranceId && item.campusId === campusId);
  const chooseUniversity = (id: string) => {setChosen(options.find((item) => item.id === id)); setCampusId(''); setEntranceId(''); setCampusPage(1); setEntrancePage(1);};
  const source = chosen?.provenance;
  return <section id="campus-start" className="university-picker" aria-labelledby="picker-title" tabIndex={-1}>
    <div className="picker-heading"><span className="picker-icon"><Icon name="compass" /></span><div><p className="landing-kicker">YOUR NEIGHBORHOOD STARTS HERE</p><h2 id="picker-title">{en.landing.pickerTitle}</h2></div><span className="picker-guest"><Icon name="lock" /> {en.landing.noAccount}</span></div>
    <form onSubmit={(event) => {event.preventDefault(); if (chosen) router.push(`/u/${chosen.slug}`);}}>
      {directory.failed ? <Notice kind="error" title={en.landing.directoryError}><p>Please try again. Your connection may be interrupted.</p><Button variant="secondary" onClick={directory.retry}>{en.landing.retryUniversities}</Button></Notice> : <>
        <div className="picker-top-row"><Field label={en.landing.findUniversity} type="search" placeholder="Type a university name" value={filter} onChange={(event) => setFilter(event.target.value)} disabled={directory.loading} />
        <div className="picker-select"><label htmlFor="university">{en.landing.university}</label><select id="university" value={chosen?.id ?? ''} onChange={(event) => chooseUniversity(event.target.value)} disabled={directory.loading} aria-describedby="university-state"><option value="">{directory.loading ? 'Loading universities…' : 'Select a university'}</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}{item.provenance.dataKind === 'SYNTHETIC' ? ' · Demo' : ''}</option>)}</select></div>
        <Button type="submit" disabled={!chosen}>{en.landing.openUniversity} <Icon name="arrow" /></Button></div>
        <p className="picker-state" id="university-state" role="status">{directory.loading ? en.landing.loadingUniversities : all.length === 0 ? en.landing.emptyUniversities : visible.length === 0 ? en.landing.noMatchingUniversities : en.landing.chooseCampusHint}</p>
        <Pagination page={page} next={directory.data?.page.hasNextPage ?? false} label="University directory" onChange={(value) => {setPage(value); setFilter('');}} />
      </>}
      {chosen && <div className="picker-campus-area">
        <div className="picker-campus-heading"><span><Icon name="pin" /> {chosen.name}</span><Badge tone={source?.dataKind === 'SYNTHETIC' ? 'warning' : 'mint'}>{source?.dataKind === 'SYNTHETIC' ? 'Synthetic demo university' : 'Source-checked university'}</Badge></div>
        <div className="picker-dependent-grid"><div>
          <div className="picker-select"><label htmlFor="campus">{en.landing.campus}</label><select id="campus" value={campusId} disabled={campuses.loading || campuses.failed || !campuses.data?.items.length} onChange={(event) => {setCampusId(event.target.value); setEntranceId(''); setEntrancePage(1);}}><option value="">{campuses.loading ? 'Loading campuses…' : 'Choose a campus'}</option>{campuses.data?.items.filter((item) => item.universityId === chosen.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <DependencyState loading={campuses.loading} failed={campuses.failed} empty={Boolean(campuses.data && !campuses.data.items.length)} name="campuses" onRetry={campuses.retry} />
          <Pagination page={campusPage} next={campuses.data?.page.hasNextPage ?? false} label="Campus directory" onChange={(value) => {setCampusPage(value); setCampusId(''); setEntranceId('');}} />
        </div><div>
          <div className="picker-select"><label htmlFor="entrance">{en.landing.entrance}</label><select id="entrance" value={entranceId} disabled={!selectedCampus || entrances.loading || entrances.failed || !entrances.data?.items.length} onChange={(event) => setEntranceId(event.target.value)}><option value="">{entrances.loading ? 'Loading entrances…' : selectedCampus ? 'Choose an entrance' : 'Choose a campus first'}</option>{entrances.data?.items.filter((item) => item.campusId === campusId).map((item) => <option key={item.id} value={item.id}>{item.name}{item.isPrimary ? ' · Main entrance' : ''}</option>)}</select></div>
          {selectedCampus && <DependencyState loading={entrances.loading} failed={entrances.failed} empty={Boolean(entrances.data && !entrances.data.items.length)} name="entrances" onRetry={entrances.retry} />}
          <Pagination page={entrancePage} next={entrances.data?.page.hasNextPage ?? false} label="Entrance directory" onChange={(value) => {setEntrancePage(value); setEntranceId('');}} />
        </div></div>
        {selectedEntrance && <p role="status" className="picker-confirmation"><Icon name="check" /> {selectedEntrance.name} selected. {selectedEntrance.provenance.dataKind === 'SYNTHETIC' ? 'Demonstration only; this is not a real gate.' : 'Public campus entrance; no boarding location is shared.'}</p>}
        <p className="picker-source">Source: {source?.sourceLabel}. {source?.dataKind === 'SYNTHETIC' ? 'Fictional campus data. No real coordinates or listings are implied.' : 'University selection does not imply university endorsement.'}</p>
      </div>}
    </form>
  </section>;
}
function DependencyState({loading, failed, empty, name, onRetry}: {loading: boolean; failed?: boolean; empty: boolean; name: string; onRetry: () => void}) {
  if (failed) return <div className="picker-error" role="alert"><p>We couldn’t load {name}.</p><Button variant="secondary" onClick={onRetry}>Retry {name}</Button></div>;
  return <p role="status" className="picker-state">{loading ? `Loading ${name}…` : empty ? `No public ${name} are available yet.` : ''}</p>;
}
function Pagination({page, next, label, onChange}: {page: number; next: boolean; label: string; onChange: (page: number) => void}) {
  if (!next && page === 1) return null;
  return <nav className="picker-pagination" aria-label={label}><Button variant="quiet" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</Button><span>Page {page}</span><Button variant="quiet" disabled={!next} onClick={() => onChange(page + 1)}>Next</Button></nav>;
}
