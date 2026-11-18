import Link from 'next/link';
import { Badge, Icon, Notice, SiteHeader } from '@unihood/ui';
export const metadata = { title: 'Contribute local knowledge | UniHood' };
export default function Page() {
  return <div className="contribution-hub"><a className="skip-link" href="#contribution-main">Skip to contributions</a><SiteHeader edition="COMMUNITY CONTRIBUTIONS" status="Browse as a guest" current="/contribute" items={[{ label: 'Explore Map', href: '/explore' }, { label: 'Advertisements', href: '/advertisements' }, { label: 'Saved favourites', href: '/saved' }, { label: 'Contribute', href: '/contribute' }]} />
    <main className="poi-detail-main" id="contribution-main" tabIndex={-1}><header className="poi-detail-heading"><p className="landing-kicker">GOOD NEIGHBOURS. BETTER CONTEXT.</p><h1>Share what helps.</h1><p>A useful suggestion starts with the right boundary. Public services and residential accommodation need different permissions.</p></header>
      <div className="contribution-paths"><article><Icon name="home" /><p className="landing-kicker">RESIDENTIAL RECOMMENDATIONS</p><h2>A boarding, without a pin.</h2><p>Suggest an advertisement with permitted context and optional broad locality. Students cannot publish residential pins, official fees, confirmed vacancy or private contact details.</p><Badge tone="warning">Synthetic intake · held only</Badge><Link className="uh-button uh-button--primary" href="/contribute/boarding">Recommend Boarding <Icon name="arrow" /></Link></article>
      <article><Icon name="pin" /><p className="landing-kicker">PUBLIC ESSENTIAL SERVICES</p><h2>A place the public can visit.</h2><p>Suggest a pharmacy, clinic, restaurant or other public service using the existing public-place proposal flow. This permission never applies to residences.</p><Badge tone="neutral">Synthetic public-service proposal</Badge><Link className="uh-button uh-button--secondary" href="/contribute/place">Add Public Place <Icon name="arrow" /></Link></article></div>
      <Notice title="No publication shortcut">Please use fictional examples in this prototype. Neither flow publishes immediately. Never submit a residence as a public service, or claim ownership through a recommendation.</Notice>
      <Link className="poi-return" href="/advertisements">Keep browsing advertisements</Link>
    </main></div>;
}
