-- UNI-042 private held suggestions, never canonical/public mutations.
CREATE TABLE unihood_private.poi_correction_intake (
 id uuid PRIMARY KEY,
 actor_ref text NOT NULL CHECK(actor_ref IN ('synthetic:contributor','synthetic:owner-a','synthetic:price-manager-a')),
 idempotency_key uuid NOT NULL,
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
 place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE RESTRICT,
 correction_kind text NOT NULL CHECK(correction_kind IN ('NAME','CATEGORY','CLOSURE','MOVED','DETAILS')),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 observed_on date NOT NULL CHECK(isfinite(observed_on)),
 review_state text NOT NULL CHECK(review_state IN ('PENDING','NEEDS_EVIDENCE')),
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(created_at)),
 UNIQUE(actor_ref,idempotency_key)
);
REVOKE ALL ON unihood_private.poi_correction_intake FROM PUBLIC;
CREATE INDEX poi_correction_intake_actor_time_idx ON unihood_private.poi_correction_intake(actor_ref,created_at DESC,id);
