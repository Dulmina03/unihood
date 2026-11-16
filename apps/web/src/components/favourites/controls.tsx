'use client';
import { useRef } from 'react';
import { Button, Icon } from '@unihood/ui';
import type { Favourite } from '../../lib/favourites/storage';
import type { Favourites } from '../../lib/favourites/use-favourites';
export function SaveEntrance({favourites, identity, name}: {favourites: Favourites; identity: Favourite; name: string}) {
  const saved = favourites.has(identity);
  return <Button className="discovery-save" variant="quiet" disabled={favourites.status !== 'ready'} aria-label={`Save ${name}`} aria-pressed={saved} onClick={() => favourites.toggle(identity)}><Icon name={saved ? 'check' : 'bookmark'} />{saved ? 'Saved' : 'Save'}</Button>;
}
export function StorageNotice({favourites}: {favourites: Favourites}) {
  const notice = useRef<HTMLDivElement>(null);
  const recover = (action: () => void) => {action(); requestAnimationFrame(() => notice.current?.focus());};
  return <div className="favourites-storage" role="status" tabIndex={-1} ref={notice}>
    {favourites.status === 'loading' ? <p>Loading saved places from this browser…</p> : favourites.status === 'corrupt' ? <><p>Saved data could not be read. Reset it to start again; other browser data is kept.</p><Button variant="secondary" onClick={() => recover(favourites.reset)}>Reset saved data</Button></> : favourites.status === 'unavailable' ? <><p>Saved storage is unavailable. Your change is not confirmed; browsing still works.</p><Button variant="secondary" onClick={() => recover(favourites.retry)}>Retry saved storage</Button></> : <p>{favourites.message || 'Saved only in this browser. No account or sync.'}</p>}
  </div>;
}
