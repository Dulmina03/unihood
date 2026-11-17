-- UNI-030: separate property, advertisement, unit and quarantined media identities.
-- Existing POI-only geometry and extension ownership remain unchanged.
ALTER TABLE public.places ADD CONSTRAINT places_boarding_identity_key UNIQUE(id,kind,data_kind);
CREATE SCHEMA unihood_private;
REVOKE ALL ON SCHEMA unihood_private FROM PUBLIC;
CREATE TABLE public.boarding_properties (
  place_id uuid PRIMARY KEY,
  place_kind text NOT NULL DEFAULT 'BOARDING' CHECK(place_kind='BOARDING'),
  data_kind text NOT NULL CHECK(data_kind IN ('SYNTHETIC','VERIFIED')),
  description text NOT NULL DEFAULT '' CHECK(length(description)<=5000),
  visibility text NOT NULL DEFAULT 'HIDDEN' CHECK(visibility IN ('PUBLIC_MAP','AREA_ONLY','HIDDEN')),
  general_locality text CHECK(general_locality IS NULL OR length(btrim(general_locality)) BETWEEN 1 AND 160),
  locality_consent boolean NOT NULL DEFAULT false,
  authorization_status text NOT NULL DEFAULT 'UNVERIFIED' CHECK(authorization_status IN ('UNVERIFIED','LOCAL_TEST_AUTHORIZED','DISPUTED')),
  public_map_consent boolean NOT NULL DEFAULT false,
  map_consent_at timestamptz CHECK(map_consent_at IS NULL OR isfinite(map_consent_at)),
  last_updated timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(last_updated)),
  FOREIGN KEY(place_id,place_kind,data_kind) REFERENCES public.places(id,kind,data_kind) ON DELETE RESTRICT,
  CHECK(authorization_status<>'LOCAL_TEST_AUTHORIZED' OR data_kind='SYNTHETIC'),
  CHECK((visibility='HIDDEN' AND general_locality IS NULL AND NOT locality_consent) OR
        (visibility<>'HIDDEN' AND ((general_locality IS NULL AND NOT locality_consent) OR (general_locality IS NOT NULL AND locality_consent)))),
  CHECK(visibility<>'AREA_ONLY' OR general_locality IS NOT NULL),
  CHECK((visibility='PUBLIC_MAP' AND public_map_consent AND map_consent_at IS NOT NULL AND authorization_status='LOCAL_TEST_AUTHORIZED') OR
        (visibility<>'PUBLIC_MAP' AND NOT public_map_consent AND map_consent_at IS NULL))
);
-- A public POI's building geometry must never reveal a residential association.
CREATE TABLE unihood_private.boarding_building_links (
  boarding_id uuid PRIMARY KEY REFERENCES public.boarding_properties(place_id) ON DELETE RESTRICT,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT
);
CREATE INDEX boarding_building_links_building_idx ON unihood_private.boarding_building_links(building_id);
CREATE TABLE unihood_private.boarding_locations (
  boarding_id uuid PRIMARY KEY REFERENCES public.boarding_properties(place_id) ON DELETE RESTRICT,
  exact_geo geometry(Point,4326) CHECK(exact_geo IS NULL OR (NOT ST_IsEmpty(exact_geo) AND ST_IsValid(exact_geo) AND ST_X(exact_geo) BETWEEN -180 AND 180 AND ST_Y(exact_geo) BETWEEN -90 AND 90)),
  address_enc bytea CHECK(address_enc IS NULL OR octet_length(address_enc)>0),
  retention_policy text NOT NULL CHECK(length(btrim(retention_policy)) BETWEEN 1 AND 160),
  CHECK(exact_geo IS NOT NULL OR address_enc IS NOT NULL)
);
CREATE TABLE public.boarding_units (
  id uuid PRIMARY KEY,
  boarding_id uuid NOT NULL REFERENCES public.boarding_properties(place_id) ON DELETE RESTRICT,
  label text NOT NULL CHECK(length(btrim(label)) BETWEEN 1 AND 160),
  room_type text NOT NULL CHECK(length(btrim(room_type)) BETWEEN 1 AND 80),
  capacity integer NOT NULL CHECK(capacity BETWEEN 0 AND 10000),
  available_beds integer CHECK(available_beds>=0 AND available_beds<=capacity),
  occupancy_rules text CHECK(occupancy_rules IS NULL OR length(occupancy_rules)<=2000)
);
CREATE INDEX boarding_units_property_idx ON public.boarding_units(boarding_id);
CREATE TABLE public.listings (
  id uuid PRIMARY KEY,
  boarding_id uuid NOT NULL REFERENCES public.boarding_properties(place_id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK(revision>0),
  publisher_kind text NOT NULL CHECK(publisher_kind IN ('OWNER_OFFICIAL','COMMUNITY_RECOMMENDATION')),
  publication_status text NOT NULL DEFAULT 'DRAFT' CHECK(publication_status IN ('DRAFT','PENDING','PUBLISHED','DISPUTED','ARCHIVED')),
  title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '' CHECK(length(description)<=5000),
  visibility_snapshot text NOT NULL DEFAULT 'HIDDEN' CHECK(visibility_snapshot IN ('PUBLIC_MAP','AREA_ONLY','HIDDEN')),
  is_current boolean NOT NULL DEFAULT false,
  published_at timestamptz CHECK(published_at IS NULL OR isfinite(published_at)),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(created_at)),
  UNIQUE(boarding_id,revision),
  CHECK(publisher_kind<>'COMMUNITY_RECOMMENDATION' OR visibility_snapshot<>'PUBLIC_MAP'),
  CHECK(NOT is_current OR publication_status='PUBLISHED'),
  CHECK((publication_status='PUBLISHED' AND published_at IS NOT NULL) OR (publication_status<>'PUBLISHED' AND NOT is_current))
);
CREATE UNIQUE INDEX listings_one_current_property_idx ON public.listings(boarding_id) WHERE is_current;
CREATE INDEX listings_property_revision_idx ON public.listings(boarding_id,revision DESC);
CREATE TABLE unihood_private.media_assets (
  id uuid PRIMARY KEY,
  object_key text NOT NULL UNIQUE CHECK(length(btrim(object_key)) BETWEEN 1 AND 512),
  uploader_ref text CHECK(uploader_ref IS NULL OR length(btrim(uploader_ref)) BETWEEN 1 AND 160),
  consent_status text NOT NULL DEFAULT 'UNKNOWN' CHECK(consent_status IN ('UNKNOWN','GRANTED','REVOKED')),
  moderation_status text NOT NULL DEFAULT 'PENDING' CHECK(moderation_status IN ('PENDING','APPROVED','REJECTED')),
  metadata_status text NOT NULL DEFAULT 'UNPROCESSED' CHECK(metadata_status IN ('UNPROCESSED','STRIPPED')),
  mime text NOT NULL CHECK(mime IN ('image/jpeg','image/png','image/webp')),
  bytes bigint NOT NULL CHECK(bytes BETWEEN 1 AND 20971520),
  checksum text NOT NULL CHECK(checksum ~ '^[a-f0-9]{64}$'),
  width integer CHECK(width BETWEEN 1 AND 16384),
  height integer CHECK(height BETWEEN 1 AND 16384),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(created_at)),
  CHECK((width IS NULL)=(height IS NULL)),
  CHECK(moderation_status<>'APPROVED' OR (consent_status='GRANTED' AND metadata_status='STRIPPED'))
);
CREATE TABLE public.listing_media (
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  asset_id uuid NOT NULL REFERENCES unihood_private.media_assets(id) ON DELETE RESTRICT,
  sort_order integer NOT NULL CHECK(sort_order BETWEEN 0 AND 100),
  PRIMARY KEY(listing_id,asset_id), UNIQUE(listing_id,sort_order)
);
REVOKE ALL ON ALL TABLES IN SCHEMA unihood_private FROM PUBLIC;
