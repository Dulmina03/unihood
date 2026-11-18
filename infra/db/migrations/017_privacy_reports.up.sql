-- UNI-044 confidential report cases, reversible takedown suppression and appeals.
-- Evidence text is AES-GCM encrypted by the API; no plaintext evidence is stored.
-- Public listing suppression is a non-identifying flag; confidential evidence stays private.
ALTER TABLE public.listings ADD COLUMN public_suppressed boolean NOT NULL DEFAULT false;
CREATE TABLE unihood_private.report_cases (
 id uuid PRIMARY KEY,
 reporter_ref text NOT NULL CHECK(reporter_ref IN ('synthetic:contributor','synthetic:owner-a','synthetic:price-manager-a')),
 idempotency_key uuid NOT NULL,
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
 target_type text NOT NULL CHECK(target_type IN ('BOARDING','POI','MEDIA','ROUTE_SEGMENT')),
 target_ref uuid NOT NULL,
 owner_boarding_ref uuid REFERENCES public.boarding_properties(place_id) ON DELETE RESTRICT,
 report_type text NOT NULL CHECK(report_type IN ('DUPLICATE','WRONG_FEE','WRONG_VACANCY','STALE_INFORMATION','INAPPROPRIATE_MEDIA','PRIVATE_DATA_EXPOSED','FAKE_OWNERSHIP','HARASSMENT','NEGATIVE_REVIEW','ROUTE_INFORMATION','CLOSURE','OTHER')),
 severity text NOT NULL CHECK(severity IN ('P0','P1','P2')),
 status text NOT NULL CHECK(status IN ('HELD','SUPPRESSED','ESCALATED','RESOLVED','DISMISSED')),
 public_effect text NOT NULL CHECK(public_effect IN ('NONE','LISTING_HIDDEN','MEDIA_BLOCKED')),
 details_ciphertext bytea NOT NULL CHECK(octet_length(details_ciphertext)>0),
 details_iv bytea NOT NULL CHECK(octet_length(details_iv)=12),
 details_auth_tag bytea NOT NULL CHECK(octet_length(details_auth_tag)=16),
 key_version text NOT NULL CHECK(key_version='LOCAL_TEST_V1'),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(created_at)),
 closed_at timestamptz CHECK(closed_at IS NULL OR (isfinite(closed_at) AND closed_at>=created_at)),
 UNIQUE(reporter_ref,idempotency_key),
 CHECK((owner_boarding_ref IS NULL)=(target_type IN ('POI','ROUTE_SEGMENT'))),
 CHECK((status IN ('RESOLVED','DISMISSED'))=(closed_at IS NOT NULL))
);
CREATE INDEX report_cases_reporter_time_idx ON unihood_private.report_cases(reporter_ref,created_at DESC,id);
CREATE INDEX report_cases_target_idx ON unihood_private.report_cases(target_type,target_ref);

CREATE TABLE unihood_private.report_appeals (
 id uuid PRIMARY KEY,
 report_id uuid NOT NULL REFERENCES unihood_private.report_cases(id) ON DELETE RESTRICT,
 appellant_ref text NOT NULL CHECK(appellant_ref IN ('synthetic:contributor','synthetic:owner-a','synthetic:price-manager-a')),
 appellant_role text NOT NULL CHECK(appellant_role IN ('REPORTER','AFFECTED_OWNER')),
 idempotency_key uuid NOT NULL,
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
 reason_ciphertext bytea NOT NULL CHECK(octet_length(reason_ciphertext)>0),
 reason_iv bytea NOT NULL CHECK(octet_length(reason_iv)=12),
 reason_auth_tag bytea NOT NULL CHECK(octet_length(reason_auth_tag)=16),
 key_version text NOT NULL CHECK(key_version='LOCAL_TEST_V1'),
 status text NOT NULL CHECK(status IN ('OPEN','GRANTED','DENIED')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(created_at)),
 decided_at timestamptz CHECK(decided_at IS NULL OR (isfinite(decided_at) AND decided_at>=created_at)),
 UNIQUE(report_id,appellant_ref),
 UNIQUE(appellant_ref,idempotency_key),
 CHECK((status='OPEN')=(decided_at IS NULL))
);

CREATE TABLE unihood_private.report_suppressions (
 id uuid PRIMARY KEY,
 report_id uuid NOT NULL UNIQUE REFERENCES unihood_private.report_cases(id) ON DELETE RESTRICT,
 target_type text NOT NULL CHECK(target_type IN ('BOARDING','MEDIA')),
 target_ref uuid NOT NULL,
 effect text NOT NULL CHECK(effect IN ('LISTING_HIDDEN','MEDIA_BLOCKED')),
 state text NOT NULL CHECK(state IN ('ACTIVE','RESTORED')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(created_at)),
 restored_at timestamptz CHECK(restored_at IS NULL OR (isfinite(restored_at) AND restored_at>=created_at)),
 CHECK((state='ACTIVE')=(restored_at IS NULL))
);
CREATE INDEX report_suppressions_public_idx ON unihood_private.report_suppressions(target_type,target_ref,state);

CREATE TABLE unihood_private.report_audit_events (
 id uuid PRIMARY KEY,
 report_id uuid NOT NULL REFERENCES unihood_private.report_cases(id) ON DELETE RESTRICT,
 event_type text NOT NULL CHECK(event_type IN ('REPORT_RECEIVED','PUBLIC_SUPPRESSION_APPLIED','PUBLIC_SUPPRESSION_RESTORED','APPEAL_OPENED','APPEAL_GRANTED','APPEAL_DENIED','REPORT_ESCALATED','REPORT_DISMISSED')),
 actor_ref text NOT NULL CHECK(actor_ref IN ('synthetic:contributor','synthetic:owner-a','synthetic:price-manager-a','synthetic:operator')),
 redacted_detail text NOT NULL CHECK(redacted_detail IN ('RECEIVED','SUPPRESSED','RESTORED','APPEAL_OPEN','APPEAL_GRANTED','APPEAL_DENIED','ESCALATED','DISMISSED')),
 occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(occurred_at))
);
CREATE INDEX report_audit_events_report_idx ON unihood_private.report_audit_events(report_id,occurred_at DESC,id);

-- Monotonic invalidation signal for public report-derived projections/derivatives.
CREATE TABLE unihood_private.public_projection_revisions (
 name text PRIMARY KEY CHECK(name='reports'),
 revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),
 updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(updated_at))
);
INSERT INTO unihood_private.public_projection_revisions(name,revision) VALUES('reports',0);

-- UNI-044 minimal eligibility gate only. Full routing remains Phase 5 (UNI-050/053).
CREATE TABLE public.route_segments (
 id uuid PRIMARY KEY,
 data_kind text NOT NULL CHECK(data_kind='SYNTHETIC'),
 source_version text NOT NULL CHECK(char_length(source_version) BETWEEN 1 AND 80),
 public_status text NOT NULL CHECK(public_status IN ('ELIGIBLE','UNAVAILABLE')),
 geometry geometry(LineString,4326) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(created_at))
);

REVOKE ALL ON unihood_private.report_cases,unihood_private.report_appeals,unihood_private.report_suppressions,unihood_private.report_audit_events,unihood_private.public_projection_revisions FROM PUBLIC;
