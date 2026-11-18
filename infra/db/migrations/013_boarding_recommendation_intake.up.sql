-- UNI-040: held synthetic intake, never canonical properties/public listings.
CREATE TABLE unihood_private.boarding_recommendation_intake (
 id uuid PRIMARY KEY,
 actor_ref text NOT NULL CHECK(actor_ref IN ('synthetic:contributor','synthetic:owner-a','synthetic:price-manager-a')),
 idempotency_key uuid NOT NULL,
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
 title text NOT NULL CHECK(title LIKE 'Synthetic %' AND length(title) BETWEEN 10 AND 120),
 description text NOT NULL CHECK(length(description) BETWEEN 15 AND 400),
 locality text CHECK(locality IN ('Synthetic North Quarter','Synthetic Garden District')),
 facilities text[] NOT NULL CHECK(facilities <@ ARRAY['Study space','Shared kitchen','Laundry area','Wi-Fi']::text[] AND cardinality(facilities)<=4),
 review_state text NOT NULL CHECK(review_state IN ('PENDING','NEEDS_EVIDENCE')),
 privacy_acknowledged boolean NOT NULL CHECK(privacy_acknowledged),
 media_guidance_acknowledged boolean NOT NULL CHECK(media_guidance_acknowledged),
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(created_at)),
 UNIQUE(actor_ref,idempotency_key)
);
REVOKE ALL ON unihood_private.boarding_recommendation_intake FROM PUBLIC;
