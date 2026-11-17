-- UNI-034: a separately selected entrance, never a private verification fallback.
ALTER TABLE public.boarding_advertisement_previews DROP CONSTRAINT boarding_advertisement_previews_visibility_check;
ALTER TABLE public.boarding_advertisement_previews DROP CONSTRAINT boarding_advertisement_previews_check;
ALTER TABLE public.boarding_advertisement_previews ADD CONSTRAINT boarding_advertisement_previews_visibility_check CHECK(visibility IN ('PUBLIC_MAP','AREA_ONLY','HIDDEN'));
ALTER TABLE public.boarding_advertisement_previews ADD CONSTRAINT boarding_advertisement_previews_mode_locality_check CHECK((visibility IN ('HIDDEN','PUBLIC_MAP') AND locality IS NULL) OR (visibility='AREA_ONLY' AND locality IS NOT NULL));
CREATE TABLE public.boarding_public_entrances (
 boarding_id uuid PRIMARY KEY REFERENCES public.boarding_properties(place_id) ON DELETE RESTRICT,
 listing_id uuid NOT NULL,
 purpose text NOT NULL CHECK(purpose='OWNER_SELECTED_PUBLIC_ENTRANCE'),
 entrance_geo geometry(Point,4326) NOT NULL CHECK(NOT ST_IsEmpty(entrance_geo) AND ST_IsValid(entrance_geo) AND ST_X(entrance_geo) BETWEEN -180 AND 180 AND ST_Y(entrance_geo) BETWEEN -90 AND 90),
 consent_at timestamptz NOT NULL CHECK(isfinite(consent_at)),
 FOREIGN KEY(listing_id,boarding_id) REFERENCES public.listings(id,boarding_id) ON DELETE RESTRICT
);
CREATE TABLE unihood_private.boarding_visibility_events (
 boarding_id uuid NOT NULL REFERENCES public.boarding_properties(place_id) ON DELETE RESTRICT,
 revision integer NOT NULL CHECK(revision>0),
 visibility text NOT NULL CHECK(visibility IN ('PUBLIC_MAP','AREA_ONLY','HIDDEN')),
 actor_ref text NOT NULL CHECK(actor_ref='synthetic:owner-a' OR actor_ref='synthetic:price-manager-a'),
 occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(occurred_at)),
 PRIMARY KEY(boarding_id,revision)
);
REVOKE ALL ON unihood_private.boarding_visibility_events FROM PUBLIC;
