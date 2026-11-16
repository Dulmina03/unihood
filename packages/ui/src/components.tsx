'use client';

import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import { listingPresentation, type ListingPhoto, type ListingView, type Vacancy } from './listing-policy';

export function Button({variant = 'primary', busy = false, children, className = '', disabled, ...props}: ButtonHTMLAttributes<HTMLButtonElement> & {variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; busy?: boolean}) {
  return <button type="button" {...props} disabled={disabled || busy} aria-busy={busy || undefined} className={`uh-button uh-button--${variant} ${className}`}>{busy && <span className="uh-spinner" aria-hidden="true" />}{children}</button>;
}
export function Chip({selected = false, children, ...props}: ButtonHTMLAttributes<HTMLButtonElement> & {selected?: boolean}) {
  return <button type="button" {...props} className="uh-chip" aria-pressed={selected}>{children}{selected && <Icon name="check" />}</button>;
}
export function Field({label, hint, error, id, ...props}: InputHTMLAttributes<HTMLInputElement> & {label: string; hint?: string; error?: string}) {
  const generated = useId();
  const fieldId = id ?? generated;
  const described = [hint && `${fieldId}-hint`, error && `${fieldId}-error`, props['aria-describedby']].filter(Boolean).join(' ');
  return <div className="uh-field"><label htmlFor={fieldId}>{label}{props.required && <> <span>(required)</span></>}</label>
    <input {...props} id={fieldId} aria-describedby={described || undefined} aria-invalid={Boolean(error) || undefined} />
    {hint && <p id={`${fieldId}-hint`} className="uh-field-hint">{hint}</p>}{error && <p id={`${fieldId}-error`} className="uh-field-error"><Icon name="alert" />{error}</p>}</div>;
}
export function SearchField({label, value, onChange, onSearch, busy = false}: {label: string; value: string; onChange: (value: string) => void; onSearch: () => void; busy?: boolean}) {
  const id = useId();
  return <form className="uh-search" role="search" onSubmit={(event) => {event.preventDefault(); onSearch();}}>
    <label htmlFor={id}>{label}</label><div className="uh-search-row"><Icon name="search" /><input type="search" id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Try “courtyard” or “community”" /><Button type="submit" busy={busy}>Search<Icon name="arrow" /></Button></div></form>;
}
export function Badge({children, tone = 'neutral', icon}: {children: ReactNode; tone?: 'neutral' | 'teal' | 'mint' | 'warning' | 'danger'; icon?: IconName}) {
  return <span className={`uh-badge uh-badge--${tone}`}>{icon && <Icon name={icon} />}{children}</span>;
}
export function SourceBadge({source}: {source: 'owner' | 'community' | 'unverified'}) {
  return source === 'owner' ? <Badge tone="mint" icon="shield">Owner-verified</Badge> : source === 'community' ? <Badge icon="users">Community-submitted</Badge> : <Badge tone="warning" icon="info">Owner unverified</Badge>;
}
export function PrivacyBadge({visibility}: {visibility: 'PUBLIC_MAP' | 'AREA_ONLY' | 'HIDDEN'}) {
  return visibility === 'PUBLIC_MAP' ? <Badge tone="teal" icon="pin">Owner map listing</Badge> : visibility === 'AREA_ONLY' ? <Badge tone="warning" icon="lock">Area-only advertisement</Badge> : <Badge icon="lock">Location private</Badge>;
}
export function VacancyBadge({status}: {status: Vacancy['status']}) {
  return <Badge tone={status === 'AVAILABLE' ? 'mint' : 'neutral'} icon={status === 'AVAILABLE' ? 'check' : 'bed'}>{status === 'AVAILABLE' ? 'Confirmed available' : status === 'FULL' ? 'Confirmed full' : 'Availability unknown'}</Badge>;
}
export function Notice({title, children, kind = 'info'}: {title: string; children: ReactNode; kind?: 'info' | 'warning' | 'error' | 'success'}) {
  return <div className={`uh-notice uh-notice--${kind}`} role={kind === 'error' ? 'alert' : undefined}><Icon name={kind === 'error' || kind === 'warning' ? 'alert' : kind === 'success' ? 'check' : 'info'} /><div><p className="uh-notice-title">{title}</p><div>{children}</div></div></div>;
}
export function EmptyState({title, children, action}: {title: string; children: ReactNode; action?: ReactNode}) {
  return <div className="uh-empty"><Icon name="search" /><h3>{title}</h3><p>{children}</p>{action}</div>;
}
export function Skeleton({label = 'Loading advertisements'}: {label?: string}) {
  return <div className="uh-skeleton" role="status"><span className="uh-sr-only">{label}</span><div aria-hidden="true"><div className="uh-skeleton-image" /><div className="uh-skeleton-line" /><div className="uh-skeleton-line uh-skeleton-line--short" /></div></div>;
}
export function Photo({photo, priority = false}: {photo?: ListingPhoto; priority?: boolean}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return <figure className="uh-photo">{photo && photo.src !== failedSrc ?
    // Framework-independent image primitive; responsive source sets are supplied by consumers.
    <img src={photo.src} srcSet={photo.srcSet} sizes="(max-width: 700px) 100vw, 50vw" width="1400" height="934" alt={photo.alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" onError={() => setFailedSrc(photo.src)} /> : <div className="uh-photo-fallback" role="img" aria-label="Photograph unavailable"><Icon name="home" /><span>Photograph unavailable</span></div>}
    <figcaption>Illustrative photograph · not a real listing</figcaption></figure>;
}
export function SiteHeader({items, current, homeHref = '/', edition = 'Campus Teal / 01', status = 'Design preview'}: {items: ReadonlyArray<{label: string; href: string}>; current?: string; homeHref?: string; edition?: string; status?: string}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  return <header className="uh-site-header" onKeyDown={(event) => {if (event.key === 'Escape' && open) {setOpen(false); toggle.current?.focus();}}}><div className="uh-header-inner"><a href={homeHref} className="uh-brand" aria-label="UniHood home"><Icon name="home" /><span>UniHood</span></a>
    <span className="uh-header-edition">{edition}</span>
    <button className="uh-menu-toggle" type="button" ref={toggle} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} /></button>
    <nav id={id} aria-label="Primary" className="uh-site-nav" data-open={open} onKeyDown={(event) => {if (event.key === 'Escape') {setOpen(false); toggle.current?.focus();}}}>
      {items.map((item) => <a key={item.href} href={item.href} aria-current={current === item.href ? 'page' : undefined} onClick={() => {setOpen(false); if (item.href.startsWith('#')) document.getElementById(item.href.slice(1))?.focus();}}>{item.label}</a>)}
    </nav><span className="uh-header-status"><span aria-hidden="true" />{status}</span></div></header>;
}
export function Modal({open, onClose, title, description, children}: {open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {closeRef.current = onClose;}, [onClose]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {dialog.close(); previous?.focus();};
  }, [open]);
  return <dialog ref={ref} className="uh-modal" tabIndex={-1} onKeyDown={(event) => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')).filter((element) => !element.hasAttribute('disabled') && element.tabIndex >= 0 && element.getClientRects().length > 0);
    const first = controls[0], last = controls[controls.length - 1];
    if (!first) {event.preventDefault(); event.currentTarget.focus();}
    else if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
  }} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} onCancel={(event) => {event.preventDefault(); closeRef.current();}} onClick={(event) => {
    if (event.target !== event.currentTarget) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
  }}><div className="uh-modal-heading"><h2 id={titleId}>{title}</h2><Button variant="quiet" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></Button></div>{description && <p id={descriptionId} className="uh-muted">{description}</p>}{children}</dialog>;
}
export function FeaturedListingCard({listing, now, saved, onSave, onPreview}: {listing: ListingView; now?: number; saved: boolean; onSave: () => void; onPreview: () => void}) {
  const policy = listingPresentation(listing, now);
  return <article className="uh-listing" aria-label={listing.title}><div className="uh-listing-media"><Photo photo={listing.photo} /><button className="uh-save" type="button" onClick={onSave} aria-label={`Save ${listing.title}`} aria-pressed={saved}><Icon name="bookmark" /></button></div>
    <div className="uh-listing-body"><div className="uh-badge-row"><PrivacyBadge visibility={policy.visibility} /></div><h3>{listing.title}</h3><SourceBadge source={policy.source} />
      <p className="uh-locality"><Icon name={policy.locality ? 'pin' : 'lock'} />{policy.locality ?? 'Location not shared'}</p>
      <div className="uh-amenities">{listing.amenities.map((amenity) => <span key={amenity}>{amenity}</span>)}</div>
      <p className={policy.price ? 'uh-price' : 'uh-muted'}>{policy.price ?? 'Price not provided by owner'}{policy.price && <span> / month</span>}</p>
      <VacancyBadge status={policy.vacancy} />
      {policy.confirmedAt && <p className="uh-freshness">Confirmed <time dateTime={policy.confirmedAt}>{new Intl.DateTimeFormat('en-GB', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo'}).format(new Date(policy.confirmedAt))} Asia/Colombo</time></p>}
      <Button variant="secondary" onClick={onPreview}>Preview advertisement<Icon name="arrow" /></Button></div></article>;
}
export function AdvertisementGrid({children}: {children: ReactNode}) {return <div className="uh-advertisement-grid">{children}</div>;}
export function ListingResultsRail({title, children}: {title: string; children: ReactNode}) {return <aside className="uh-results-rail" aria-label={title}><p className="uh-overline">Owner-public listings only</p><h3>{title}</h3>{children}</aside>;}
export function MapLayerControls({options, selected, onChange}: {options: ReadonlyArray<{id: string; label: string; icon: IconName}>; selected: readonly string[]; onChange: (id: string) => void}) {
  return <div className="uh-layer-controls" role="group" aria-label="Map layers">{options.map((option) => <Chip key={option.id} selected={selected.includes(option.id)} onClick={() => onChange(option.id)}><Icon name={option.icon} />{option.label}</Chip>)}</div>;
}
export function MapCanvas({children, loading = false, onShowList}: {children?: ReactNode; loading?: boolean; onShowList: () => void}) {
  return <div className="uh-map-canvas"><div className="uh-map-fallback" role="status"><span className="uh-map-symbol"><Icon name="compass" /></span><h3>{loading ? 'Loading map preview' : 'The map starts with permission.'}</h3><p>{loading ? 'Waiting for a configured provider.' : 'Map provider not connected. No geography, locations or routes are fabricated in this component preview.'}</p><Button variant="secondary" onClick={onShowList}>Show listing examples<Icon name="arrow" /></Button></div>{children}</div>;
}
export function MapPropertyPreview({listing, now, onPreview}: {listing: ListingView; now?: number; onPreview: () => void}) {
  const policy = listingPresentation(listing, now);
  if (!policy.mapEligible) return null;
  return <aside className="uh-map-preview" aria-label="Owner-public property preview"><div className="uh-badge-row"><PrivacyBadge visibility="PUBLIC_MAP" /><SourceBadge source="owner" /></div><h3>{listing.title}</h3><p className="uh-muted">Explicit owner map consent · synthetic example</p><VacancyBadge status={policy.vacancy} /><p className="uh-price">{policy.price ?? 'Price not provided by owner'}</p><p className="uh-muted">Walking route unavailable</p><div className="uh-button-row"><Button onClick={onPreview}>Preview<Icon name="arrow" /></Button><Button variant="secondary" disabled>Directions unavailable</Button></div></aside>;
}
