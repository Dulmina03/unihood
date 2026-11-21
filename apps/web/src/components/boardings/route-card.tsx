'use client';

import { useEffect, useState } from 'react';
import {
  parsePedestrianRouteSegmentsResult,
  parsePedestrianRouteObservationsResult,
  type PedestrianRouteSegmentsResultUnion,
  type PedestrianRouteObservationsResultUnion,
} from '@unihood/contracts';
import { Badge, Button, Chip, Notice, Skeleton } from '@unihood/ui';

type TimeContext = 'DAY' | 'NIGHT';

const CONDITION_LABELS: Record<string, string> = {
  LIGHTING: 'Lighting',
  FOOTPATH: 'Footpath',
  TRAFFIC: 'Traffic',
  FLOODING: 'Flooding',
  OBSTRUCTIONS: 'Obstructions',
  ACTIVITY: 'Activity',
};

const STATUS_BADGE_TONE: Record<string, 'neutral' | 'teal' | 'warning' | 'danger'> = {
  GOOD: 'teal',
  POOR: 'danger',
  UNKNOWN: 'neutral',
};

export function RouteCard({ gateId, boardingId, timeContext: initialTimeContext }: { gateId: string; boardingId: string; timeContext?: TimeContext }) {
  const [attempt, setAttempt] = useState(0);
  const key = `${gateId}:${boardingId}:${attempt}`;
  const [timeContext, setTimeContext] = useState<TimeContext>(initialTimeContext ?? 'DAY');
  const [result, setResult] = useState<{
    key: string;
    segments?: PedestrianRouteSegmentsResultUnion;
    observations?: PedestrianRouteObservationsResultUnion;
    failed?: boolean;
  }>({ key: '' });

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const fetchRouteData = async () => {
      const fetchJson = async (path: string) => {
        const res = await fetch(path, {
          cache: 'no-store',
          credentials: 'omit',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        return res.json();
      };

      const segmentsUrl = `/api/routes/segments?gateId=${encodeURIComponent(gateId)}&boardingId=${encodeURIComponent(boardingId)}&timeContext=${encodeURIComponent(timeContext)}`;
      const observationsUrl = `/api/routes/observations?gateId=${encodeURIComponent(gateId)}&boardingId=${encodeURIComponent(boardingId)}&timeContext=${encodeURIComponent(timeContext)}`;

      const [segmentsJson, observationsJson] = await Promise.all([fetchJson(segmentsUrl), fetchJson(observationsUrl)]);

      const segments = parsePedestrianRouteSegmentsResult(segmentsJson);
      const observations = parsePedestrianRouteObservationsResult(observationsJson);

      if (live) setResult({ key, segments, observations });
    };

    fetchRouteData().catch(() => {
      if (live) setResult({ key, failed: true });
    });

    return () => {
      live = false;
      controller.abort();
      clearTimeout(timer);
      setResult({ key: '' });
    };
  }, [gateId, boardingId, timeContext, key]);

  const current = result.key === key ? result : undefined;

  const isAnyUnavailable =
    current?.segments?.status === 'UNAVAILABLE' || current?.observations?.status === 'UNAVAILABLE';

  const isAnyAvailable =
    current?.segments?.status === 'AVAILABLE' || current?.observations?.status === 'AVAILABLE';

  const unavailableReason =
    current?.segments?.status === 'UNAVAILABLE'
      ? current.segments.reason
      : current?.observations?.status === 'UNAVAILABLE'
        ? current.observations.reason
        : null;

  const syntheticNote =
    'Illustrative synthetic route observations — not a safety assessment. Condition labels are fictitious and do not imply a route is safe or unsafe.';

  if (!gateId || !boardingId) {
    return null;
  }

  if (current?.segments?.status === 'UNAVAILABLE' && current?.observations?.status === 'UNAVAILABLE') {
    return (
      <section className="route-card" aria-labelledby="route-card-title">
        <div className="route-card-header">
          <h2 id="route-card-title">Walking route conditions</h2>
          <div className="route-card-time-selector">
            <span className="route-card-time-label">Time context</span>
            <Chip selected={timeContext === 'DAY'} onClick={() => setTimeContext('DAY')}>Day</Chip>
            <Chip selected={timeContext === 'NIGHT'} onClick={() => setTimeContext('NIGHT')}>Night</Chip>
          </div>
        </div>
        <p className="route-card-provenance">{syntheticNote}</p>
        <Notice kind="error" title="Route conditions unavailable">
          <p>
            {unavailableReason === 'NO_ROUTE'
              ? 'No walking route was found between this entrance and the selected gate for the chosen time context.'
              : unavailableReason === 'UNSUPPORTED_TIME_CONTEXT'
                ? 'The selected time context is not supported for this route.'
                : 'Route conditions could not be checked for this entrance.'}
          </p>
          <Button variant="secondary" onClick={() => setAttempt((v) => v + 1)}>Retry route conditions</Button>
        </Notice>
      </section>
    );
  }

  return (
    <section className="route-card" aria-labelledby="route-card-title">
      <div className="route-card-header">
        <h2 id="route-card-title">Walking route conditions</h2>
        <div className="route-card-time-selector">
          <span className="route-card-time-label">Time context</span>
          <Chip selected={timeContext === 'DAY'} onClick={() => setTimeContext('DAY')}>Day</Chip>
          <Chip selected={timeContext === 'NIGHT'} onClick={() => setTimeContext('NIGHT')}>Night</Chip>
        </div>
      </div>
      <p className="route-card-provenance">{syntheticNote}</p>

      {!current ? (
        <Skeleton label="Loading route conditions…" />
      ) : current.failed ? (
        <Notice kind="error" title="Route conditions unavailable">
          <p>We couldn’t check route conditions for this entrance. Your privacy settings remain safe.</p>
          <Button variant="secondary" onClick={() => setAttempt((v) => v + 1)}>Retry route conditions</Button>
        </Notice>
      ) : (
        <>
          {current.segments?.status === 'AVAILABLE' && (
            <div className="route-card-segments">
              <h3 className="route-card-section-title">Route segments</h3>
              <ul className="route-card-segment-list" aria-label="Route segment conditions">
                {current.segments.segments.map((segment) => (
                  <li key={segment.segmentId} className="route-card-segment-item">
                    <div className="route-card-segment-meta">
                      <span className="route-card-segment-distance">{segment.distanceMeters} m</span>
                      <span className="route-card-segment-duration">
                        {Math.round(segment.durationSeconds / 60)} min walk
                      </span>
                      <Badge tone="neutral">{segment.timeContext}</Badge>
                    </div>
                    <ul className="route-card-condition-list" aria-label={`Segment ${segment.segmentId} conditions`}>
                      {segment.conditions.map((condition) => (
                        <li key={`${segment.segmentId}-${condition.type}`} className="route-card-condition-item">
                          <span className="route-card-condition-name">{CONDITION_LABELS[condition.type]}</span>
                          <Badge tone={STATUS_BADGE_TONE[condition.status]}>{condition.status}</Badge>
                          <span className="route-card-condition-confidence">{condition.confidence}</span>
                          <span className="route-card-condition-source">{condition.source}</span>
                          {condition.observedAt && (
                            <span className="route-card-condition-observed">{new Date(condition.observedAt).toLocaleDateString()}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {current.observations?.status === 'AVAILABLE' && (
            <div className="route-card-observations">
              <h3 className="route-card-section-title">Day/night observations</h3>
              {current.observations.observations.map((observation) => (
                <div key={observation.observationId} className="route-card-observation-item">
                  <div className="route-card-observation-meta">
                    <time dateTime={observation.observedAt}>
                      {new Date(observation.observedAt).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                    <Badge tone="neutral">{observation.timeContext}</Badge>
                    <span className="route-card-observation-confidence">{observation.confidence}</span>
                  </div>
                  <p className="route-card-observation-note">{observation.overallNote}</p>
                  <ul className="route-card-condition-list" aria-label={`Observation ${observation.observationId} conditions`}>
                    {observation.segments.flatMap((segment) =>
                      segment.conditions.map((condition) => ({
                        segmentId: segment.segmentId,
                        condition,
                      })))
                    .map(({ segmentId, condition }) => (
                      <li key={`${segmentId}-${condition.type}`} className="route-card-condition-item">
                        <span className="route-card-condition-name">{CONDITION_LABELS[condition.type]}</span>
                        <Badge tone={STATUS_BADGE_TONE[condition.status]}>{condition.status}</Badge>
                        <span className="route-card-condition-confidence">{condition.confidence}</span>
                        <span className="route-card-condition-source">{condition.source}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="route-card-observation-source">{observation.source}</p>
                </div>
              ))}
            </div>
          )}

          {isAnyUnavailable && isAnyAvailable && (
            <Notice kind="warning" title="Partial route conditions">
              <p>
                Some route condition data is unavailable ({unavailableReason}). Available segments and
                observations are shown above; missing data does not imply satisfactory conditions.
              </p>
            </Notice>
          )}
        </>
      )}
    </section>
  );
}
