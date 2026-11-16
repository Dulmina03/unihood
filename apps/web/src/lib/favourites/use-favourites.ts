'use client';
import { useState, useSyncExternalStore } from 'react';
import { favouriteKey, FAVOURITES_KEY, readFavourites, MAX_FAVOURITES, validateFavourite, writeFavourites, type Favourite, type FavouriteSnapshot } from './storage';
const changeEvent = 'unihood:favourites-change';
const serverSnapshot = JSON.stringify({status: 'loading', entries: []});
function browserSnapshot() {
  try {return JSON.stringify(readFavourites(window.localStorage));}
  catch {return JSON.stringify({status: 'unavailable', entries: []});}
}
function subscribe(changed: () => void) {
  const storageChanged = (event: StorageEvent) => {if (event.key === FAVOURITES_KEY || event.key === null) changed();};
  window.addEventListener('storage', storageChanged); window.addEventListener(changeEvent, changed);
  return () => {window.removeEventListener('storage', storageChanged); window.removeEventListener(changeEvent, changed);};
}
export function useFavourites() {
  // Stable primitive snapshots avoid render loops; server rendering never reads browser storage.
  const serialized = useSyncExternalStore(subscribe, browserSnapshot, () => serverSnapshot);
  const [writeFailed, setWriteFailed] = useState(false);
  const snapshot = (writeFailed ? {status: 'unavailable', entries: []} : JSON.parse(serialized)) as Omit<FavouriteSnapshot, 'status'> & {status: FavouriteSnapshot['status'] | 'loading'};
  const [message, setMessage] = useState('');
  const refresh = () => {setWriteFailed(false); window.dispatchEvent(new Event(changeEvent));};
  const commit = (change: (entries: Favourite[]) => Favourite[], text: string) => {
    try {
      const current = readFavourites(window.localStorage);
      if (current.status !== 'ready') {window.dispatchEvent(new Event(changeEvent)); return false;}
      const entries = change(current.entries);
      if (entries.length > MAX_FAVOURITES) {setMessage(`You can save up to ${MAX_FAVOURITES} public entrances. Remove one to save another.`); return false;}
      writeFavourites(window.localStorage, entries);
      setWriteFailed(false); setMessage(text); window.dispatchEvent(new Event(changeEvent)); return true;
    } catch {setWriteFailed(true); setMessage('Your change could not be saved. Browsing still works.'); return false;}
  };
  return {...snapshot, message, retry: () => {setMessage(''); refresh();},
    has: (item: Favourite) => snapshot.entries.some((value) => favouriteKey(value) === favouriteKey(item)),
    toggle: (value: Favourite) => {
      const item = validateFavourite(value); if (!item) return false;
      return commit((entries) => entries.some((entry) => favouriteKey(entry) === favouriteKey(item)) ? entries.filter((entry) => favouriteKey(entry) !== favouriteKey(item)) : [...entries, item], 'Saved places updated on this browser only.');
    },
    remove: (item: Favourite) => commit((entries) => entries.filter((entry) => favouriteKey(entry) !== favouriteKey(item)), 'Place removed from saved favourites.'),
    clear: () => commit(() => [], 'All saved places removed from this browser.'),
    reset: () => {try {window.localStorage.removeItem(FAVOURITES_KEY); setMessage('Unreadable saved data removed. You can save public entrances again.'); refresh(); window.dispatchEvent(new Event(changeEvent));} catch {setWriteFailed(true);}},
  };
}
export type Favourites = ReturnType<typeof useFavourites>;
