import { Badge, Icon } from '@unihood/ui';
import type { PublicGate } from '../../lib/maps/points';
import type { Favourite } from '../../lib/favourites/storage';
import type { Favourites } from '../../lib/favourites/use-favourites';
import { SaveEntrance } from '../favourites/controls';
export function EntranceCard({item, identity, campus, index, selected, onSelect, favourites}: {item: PublicGate; identity: Favourite; campus: string; index: number; selected: boolean; onSelect: () => void; favourites: Favourites}) {
  return <article className="discovery-card" data-selected={selected}>
    <button type="button" className="discovery-card-open" aria-pressed={selected} onClick={onSelect}><span className="explore-gate-symbol"><Icon name="pin" /></span><span className="explore-result-text"><small>PUBLIC CAMPUS ENTRANCE · {String(index + 1).padStart(2, '0')}</small><strong>{item.name}</strong><span>{campus}</span><Badge tone={item.provenance.dataKind === 'SYNTHETIC' ? 'warning' : 'mint'}>{item.provenance.dataKind === 'SYNTHETIC' ? 'Synthetic example' : 'Public source'}</Badge></span><Icon name="arrow" /></button>
    <div className="discovery-card-footer"><span>{item.isPrimary ? 'Primary gate' : 'Public access point'}</span><SaveEntrance favourites={favourites} identity={identity} name={item.name} /></div>
  </article>;
}
