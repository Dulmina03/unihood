-- Held, private associations only. No property merge or owner authority grant.
CREATE TABLE unihood_private.boarding_recommendation_resolutions (
 contribution_id uuid PRIMARY KEY REFERENCES unihood_private.boarding_recommendation_intake(id) ON DELETE RESTRICT,
 resolution_hash text NOT NULL CHECK(resolution_hash ~ '^[a-f0-9]{64}$'),
 resolution_kind text NOT NULL CHECK(resolution_kind IN ('EXISTING','DISTINCT')),
 canonical_boarding_id uuid REFERENCES public.boarding_properties(place_id) ON DELETE RESTRICT,
 possible_related_intake_id uuid REFERENCES unihood_private.boarding_recommendation_intake(id) ON DELETE RESTRICT,
 distinction_reason text CHECK(distinction_reason IS NULL OR length(distinction_reason) BETWEEN 15 AND 240),
 review_state text NOT NULL CHECK(review_state IN ('PENDING','NEEDS_EVIDENCE')),
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(created_at)),
 CHECK(possible_related_intake_id IS NULL OR possible_related_intake_id<>contribution_id),
 CHECK((resolution_kind='EXISTING' AND canonical_boarding_id IS NOT NULL AND distinction_reason IS NULL AND possible_related_intake_id IS NULL) OR
       (resolution_kind='DISTINCT' AND canonical_boarding_id IS NULL AND distinction_reason IS NOT NULL AND review_state='NEEDS_EVIDENCE'))
);
REVOKE ALL ON unihood_private.boarding_recommendation_resolutions FROM PUBLIC;
