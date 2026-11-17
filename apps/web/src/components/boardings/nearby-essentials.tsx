'use client';

import { useCallback, useEffect, useState } from 'react';
import { parseBoardingNearbyEssentials, type BoardingNearbyEssentialsResponse } from '@unihood/contracts';
import { usePublicRevalidation } from '../../lib/boardings/use-public-revalidation';
import { Badge, Button, EmptyState, Icon, Notice, Skeleton } from '@unihood/ui';

export function NearbyEssentials({ id, visibility }: { id: string; visibility: string }) {
  const [attempt, setAttempt] = useState(0);
  const key = `${id}:${visibility}:${attempt}`;
  const [result, setResult] = useState<{ key: string; data?: BoardingNearbyEssentialsResponse; failed?: boolean }>({ key: '' });

  const refresh = useCallback(() => setAttempt(value => value + 1), []);
  usePublicRevalidation(visibility === 'PUBLIC_MAP', refresh);

  useEffect(() => {
    if (visibility !== 'PUBLIC_MAP') return;
    let live = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    fetch(`/api/boardings/${id}/nearby-essentials`, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const json = await res.json();
        const parsed = parseBoardingNearbyEssentials(json);
        if (parsed.boardingId !== id) throw new Error();
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
      setResult({ key: '' });
    };
  }, [id, visibility, key]);

  if (visibility !== 'PUBLIC_MAP') {
    return (
      <section className="boarding-essentials" aria-labelledby="essentials-title">
        <h2 id="essentials-title">Nearby essentials & amenities</h2>
        <div className="essentials-private-notice">
          <Icon name="lock" />
          <p>
            <strong>Proximity is not computed for private listings.</strong> Walking distances and nearby public services are available only for owner-consented public map listings.
          </p>
        </div>
      </section>
    );
  }

  const current = result.key === key ? result : undefined;

  return (
    <section className="boarding-essentials" aria-labelledby="essentials-title">
      <div className="essentials-header">
        <h2 id="essentials-title">Nearby essentials & amenities</h2>
        <Badge tone="mint">Owner-consented public entrance</Badge>
      </div>
      <p className="essentials-intro">
        Straight-line distance to public services from the verified owner entrance. Walking routes and conditions are covered in walking routes.
      </p>

      {!current ? (
        <Skeleton label="Finding nearby essentials…" />
      ) : current.failed ? (
        <Notice kind="error" title="Nearby essentials unavailable">
          <p>We couldn’t check nearby amenities for this public entrance. Your privacy settings remain safe.</p>
          <Button variant="secondary" onClick={() => setAttempt((v) => v + 1)}>Retry nearby essentials</Button>
        </Notice>
      ) : !current.data || current.data.items.length === 0 ? (
        <EmptyState title="No nearby essentials found">
          No active public services were found within 2 km of this entrance.
        </EmptyState>
      ) : (
        <ul className="essentials-grid" aria-label="Nearby public essentials">
          {current.data.items.map((item) => (
            <li key={item.id} className="essential-card">
              <div className="essential-category-badge">
                <Icon name="pin" />
                <span>{item.category.label}</span>
              </div>
              <h3 className="essential-name">{item.name}</h3>
              <p className="essential-distance">
                <strong>{item.distanceMeters} m</strong> away
              </p>
              <p className="essential-provenance">
                {item.provenance.sourceLabel}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
