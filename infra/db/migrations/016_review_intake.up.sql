-- UNI-043 private held structured reviews, never canonical/public mutations.
CREATE TABLE unihood_private.review_intake (
 id uuid PRIMARY KEY,
 actor_ref text NOT NULL CHECK(actor_ref IN ('synthetic:contributor','synthetic:owner-a','synthetic:price-manager-a')),
 idempotency_key uuid NOT NULL,
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
 target_type text NOT NULL CHECK(target_type IN ('BOARDING','POI')),
 target_id uuid NOT NULL REFERENCES public.places(id) ON DELETE RESTRICT,
 review_kind text NOT NULL CHECK(review_kind IN ('GENERAL_OBSERVATION','VERIFIED_STAY')),
 rating smallint CHECK(rating >= 1 AND rating <= 5),
 observation text CHECK(char_length(observation) <= 1000),
 review_state text NOT NULL CHECK(review_state IN ('PENDING','NEEDS_EVIDENCE')),
 source_confidence text NOT NULL CHECK(source_confidence IN ('COMMUNITY_SUBMITTED','SOURCE_CHECKED')),
 source_label text NOT NULL CHECK(source_label IN ('SYNTHETIC','HELD_UNVERIFIED')),
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(created_at)),
 UNIQUE(actor_ref,idempotency_key),
 CHECK((rating IS NOT NULL) OR (observation IS NOT NULL AND char_length(trim(observation)) > 0))
);
REVOKE ALL ON unihood_private.review_intake FROM PUBLIC;
CREATE INDEX review_intake_actor_time_idx ON unihood_private.review_intake(actor_ref,created_at DESC,id);
