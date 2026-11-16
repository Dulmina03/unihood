import Link from 'next/link';

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header><Link className="wordmark" href="/" aria-label="UniHood home">UniHood<span>Boarding & neighborhood discovery</span></Link><span className="preview">Development preview</span></header>
      <main id="main" tabIndex={-1}>
        <p className="eyebrow">A neighborhood for your next chapter</p>
        <h1>Find your place.<br />Get to know your neighborhood.</h1>
        <p className="intro">Discover boarding advertisements and nearby essentials, with privacy at the heart of every listing.</p>
        <section aria-labelledby="status-title" className="notice">
          <h2 id="status-title">We’re building UniHood</h2>
          <p>Discovery is coming soon. This development preview contains no live listings, prices, vacancies or map locations.</p>
        </section>
        <section aria-labelledby="privacy-title">
          <h2 id="privacy-title">Your location. Your choice.</h2>
          <div className="principles">
            <article><h3>Owner map listings</h3><p>Only authorized owners can publish exact boarding locations, with explicit consent.</p></article>
            <article><h3>Private advertisements</h3><p>Owners can advertise while keeping their exact location private.</p></article>
            <article><h3>Community recommendations</h3><p>Community boarding recommendations appear as advertisements, without exact map pins or official owner prices.</p></article>
          </div>
        </section>
      </main>
      <footer>UniHood · Built for university neighborhoods in Sri Lanka.</footer>
    </>
  );
}
