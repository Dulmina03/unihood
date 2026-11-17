'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { parseBoardingComparisonResponse, type BoardingComparisonResponse } from '@unihood/contracts';
import { Badge, Button, EmptyState, Icon, Notice, SiteHeader, Skeleton } from '@unihood/ui';

export function BoardingCompare({ initialIds }: { initialIds: string[] }) {
  const [ids, setIds] = useState<string[]>(initialIds);
  const [attempt, setAttempt] = useState(0);
  const key = `${ids.join(',')}:${attempt}`;
  const [result, setResult] = useState<{ key: string; data?: BoardingComparisonResponse; failed?: boolean }>({ key: '' });
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (ids.length === 0) return;
    let live = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    fetch(`/api/boardings/compare?ids=${ids.join(',')}`, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const json = await res.json();
        const parsed = parseBoardingComparisonResponse(json);
        if (live) setResult({ key, data: parsed });
      })
      .catch(() => {
        if (live) setResult({ key, failed: true });
      })
      .finally(() => clearTimeout(timer));

    return () => {
      live = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [ids, key]);

  const removeId = (idToRemove: string) => {
    const next = ids.filter((id) => id !== idToRemove);
    setIds(next);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (next.length > 0) {
        url.searchParams.set('ids', next.join(','));
      } else {
        url.searchParams.delete('ids');
      }
      window.history.replaceState(null, '', url.toString());
    }
  };

  const current = result.key === key ? result : undefined;

  return (
    <div className="compare-page">
      <a className="skip-link" href="#compare-main">Skip to content</a>
      <SiteHeader
        edition="COMPARE BOARDINGS"
        status="Browse as a guest"
        current="/compare"
        items={[
          { label: 'Advertisements', href: '/advertisements' },
          { label: 'Explore Map', href: '/explore' },
          { label: 'Saved favourites', href: '/saved' },
        ]}
      />
      <main id="compare-main" tabIndex={-1} className="compare-main">
        <nav aria-label="Breadcrumb">
          <Link href="/advertisements">← All advertisements</Link>
        </nav>
        <header className="compare-header">
          <p className="landing-kicker">SIDE-BY-SIDE EVALUATION</p>
          <h1 ref={heading} tabIndex={-1}>Compare accommodations</h1>
          <p>
            Official fees, verified vacancy freshness, declared facilities and nearby essentials. Values are shown honestly: private locations and unconfirmed claims are labeled clearly.
          </p>
        </header>

        {ids.length === 0 ? (
          <EmptyState
            title="No boardings selected for comparison"
            action={<Link className="uh-button uh-button--primary" href="/advertisements">Browse advertisements <Icon name="arrow" /></Link>}
          >
            Select up to 4 boardings to evaluate fees, availability and nearby services side-by-side.
          </EmptyState>
        ) : !current ? (
          <Skeleton label="Comparing boarding properties…" />
        ) : current.failed ? (
          <Notice kind="error" title="We couldn’t load the comparison">
            <p>Please check your connection and retry. No private details are substituted.</p>
            <Button onClick={() => setAttempt((v) => v + 1)}>Retry comparison</Button>
          </Notice>
        ) : !current.data || current.data.items.length === 0 ? (
          <EmptyState
            title="Comparison not available"
            action={<Link className="uh-button uh-button--primary" href="/advertisements">Return to advertisements <Icon name="arrow" /></Link>}
          >
            The selected boarding IDs are not currently available for public comparison.
          </EmptyState>
        ) : (
          <div className="compare-matrix-wrapper">
            <table className="compare-table" aria-label="Boarding comparison matrix">
              <caption className="visually-hidden">Comparison of selected boarding properties</caption>
              <thead>
                <tr>
                  <th scope="col" className="compare-feature-col">Feature</th>
                  {current.data.items.map((item) => (
                    <th key={item.id} scope="col" className="compare-item-header">
                      <div className="compare-item-top">
                        <Badge tone={item.publisherKind === 'OWNER_OFFICIAL' ? 'mint' : 'warning'}>
                          {item.publisherKind === 'OWNER_OFFICIAL' ? 'Owner verified' : 'Community'}
                        </Badge>
                        <Button
                          variant="quiet"
                          aria-label={`Remove ${item.title} from comparison`}
                          onClick={() => removeId(item.id)}
                        >
                          <Icon name="close" />
                        </Button>
                      </div>
                      <h3>{item.title}</h3>
                      <Link className="compare-detail-link" href={`/boardings/${item.id}`}>
                        View advertisement <Icon name="arrow" />
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Location & Visibility</th>
                  {current.data.items.map((item) => (
                    <td key={item.id}>
                      {item.visibility === 'PUBLIC_MAP' ? (
                        <>
                          <Badge tone="mint">Public map</Badge>
                          <p>Consented public entrance</p>
                        </>
                      ) : item.visibility === 'AREA_ONLY' ? (
                        <>
                          <Badge tone="warning">Area only</Badge>
                          <p>{item.locationLabel ?? 'Broad locality'}</p>
                        </>
                      ) : (
                        <>
                          <Badge tone="neutral">Location hidden</Badge>
                          <p>Location not shared</p>
                        </>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <th scope="row">Monthly Rent</th>
                  {current.data.items.map((item) => (
                    <td key={item.id}>
                      {item.price ? (
                        <>
                          <span className="compare-price">
                            LKR {new Intl.NumberFormat('en-LK').format(item.price.rentMonthly)}
                          </span>
                          <small> per month</small>
                          {item.price.deposit !== undefined && (
                            <p className="compare-subtext">
                              Deposit: LKR {new Intl.NumberFormat('en-LK').format(item.price.deposit)}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="compare-unspecified">Not shared / Unpriced</span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <th scope="row">Availability & Freshness</th>
                  {current.data.items.map((item) => (
                    <td key={item.id}>
                      {item.vacancy.status === 'AVAILABLE' ? (
                        <>
                          <span className="compare-vacancy-available">Available</span>
                          {item.vacancy.confirmedAt && (
                            <p className="compare-subtext">
                              Confirmed {new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeZone: 'Asia/Colombo' }).format(new Date(item.vacancy.confirmedAt))}
                            </p>
                          )}
                        </>
                      ) : item.vacancy.status === 'FULL' ? (
                        <span className="compare-vacancy-full">Full</span>
                      ) : (
                        <span className="compare-unspecified">Unknown / Unconfirmed</span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <th scope="row">Units & Capacities</th>
                  {current.data.items.map((item) => (
                    <td key={item.id}>
                      {item.unitsSummary.length > 0 ? (
                        <ul className="compare-units-list">
                          {item.unitsSummary.map((u) => (
                            <li key={u.id}>
                              {u.label} ({u.capacity} {u.capacity === 1 ? 'person' : 'people'})
                              {u.rentMinor !== null && ` · LKR ${(u.rentMinor / 100).toLocaleString()}`}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="compare-unspecified">Not specified</span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <th scope="row">Nearby Essentials (Straight-line)</th>
                  {current.data.items.map((item) => (
                    <td key={item.id}>
                      {item.visibility === 'PUBLIC_MAP' && item.nearbyEssentials ? (
                        item.nearbyEssentials.length > 0 ? (
                          <ul className="compare-essentials-list">
                            {item.nearbyEssentials.map((e) => (
                              <li key={e.category}>
                                <strong>{e.label}</strong> ({e.count}): {e.nearestDistanceMeters !== null ? `${e.nearestDistanceMeters}m` : 'nearby'}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="compare-subtext">No POIs within 2 km</span>
                        )
                      ) : (
                        <span className="compare-not-shared">
                          <Icon name="lock" /> Not shared (location private)
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <th scope="row">Summary</th>
                  {current.data.items.map((item) => (
                    <td key={item.id} className="compare-summary-cell">
                      <p>{item.summary}</p>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <footer className="compare-footer">
          <p>
            Synthetic demonstration · no real accommodation, verified owner claims or bookings. Proximity and exact coordinates are strictly excluded for area-only and hidden advertisements.
          </p>
        </footer>
      </main>
    </div>
  );
}
