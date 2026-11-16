import type { PublicPoi } from '@unihood/contracts';
export function absolutePlaceDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo'}).format(new Date(value));
}
export function confirmationRecency(value: string, now = Date.now()) {
  const days = Math.floor((now - Date.parse(value)) / 86400000);
  return days < 0 ? 'Confirmation date is in the future; check the source' : days === 0 ? 'Confirmed today' : days === 1 ? 'Confirmed 1 day ago' : `Confirmed ${days} days ago`;
}
export function PlaceTimestamp({value}: {value: string}) {
  return <time dateTime={value}>{absolutePlaceDate(value)} · Asia/Colombo</time>;
}
export function SourceFreshness({item}: {item: PublicPoi}) {
  return <div className="poi-source-freshness"><p className="explore-preview-source">{item.provenance.sourceLabel}</p>
    <p>{item.provenance.dataKind === 'SYNTHETIC' ? 'Fictional fixture · not a verified business.' : <>Source verified: <PlaceTimestamp value={item.provenance.verifiedAt} />. Verification does not confirm opening hours or ownership.</>}</p>
    <p>{item.lastConfirmedAt ? <>{confirmationRecency(item.lastConfirmedAt)}<br /><PlaceTimestamp value={item.lastConfirmedAt} /></> : 'Location confirmation not recorded.'}</p>
  </div>;
}
