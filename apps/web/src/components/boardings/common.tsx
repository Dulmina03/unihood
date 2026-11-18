'use client';
import { Badge,PrivacyBadge,SourceBadge,SiteHeader } from '@unihood/ui';
import type { PublicBoardingAdvertisement } from '@unihood/contracts';
export function BoardingHeader(){return <><a className="skip-link" href="#boarding-main">Skip to content</a><SiteHeader edition="A PLACE TO BEGIN" status="Browse as a guest" items={[{label:'Explore Map',href:'/explore'},{label:'Advertisements',href:'/advertisements'},{label:'Saved favourites',href:'/saved'},{label:'About privacy',href:'/#privacy'},{label:'Contribute',href:'/contribute'}]} /></>;}
export function BoardingBadges({item}:{item:PublicBoardingAdvertisement}){const l=item.listing;return <div className="ads-badges"><Badge tone="warning">Synthetic demonstration</Badge>{l.publisherKind==='COMMUNITY_RECOMMENDATION'?<SourceBadge source="community" />:<Badge tone="mint" icon="shield">Owner-posted · synthetic authority only</Badge>}<PrivacyBadge visibility={l.visibility} /></div>;}
