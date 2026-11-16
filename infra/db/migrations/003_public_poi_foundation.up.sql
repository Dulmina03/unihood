-- UNI-020: public POI foundation only. No residential locations or write routes.
CREATE TABLE public.poi_categories (
  code text PRIMARY KEY CHECK (length(code) BETWEEN 1 AND 60 AND code ~ '^[a-z][a-z0-9_]*$'),
  label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 120)
);
CREATE TABLE public.buildings (
  id uuid PRIMARY KEY,
  public_geo geometry(Point,4326) CHECK (public_geo IS NULL OR
    (NOT ST_IsEmpty(public_geo) AND ST_IsValid(public_geo) AND
     ST_X(public_geo) BETWEEN -180 AND 180 AND ST_Y(public_geo) BETWEEN -90 AND 90)),
  address_label text CHECK (address_label IS NULL OR length(btrim(address_label)) BETWEEN 1 AND 240),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  data_kind text NOT NULL CHECK (data_kind IN ('SYNTHETIC','VERIFIED')),
  source_label text NOT NULL CHECK (length(btrim(source_label)) BETWEEN 1 AND 240),
  verified_at timestamptz,
  CHECK ((data_kind='SYNTHETIC' AND verified_at IS NULL) OR
         (data_kind='VERIFIED' AND verified_at IS NOT NULL AND isfinite(verified_at)))
);
CREATE TABLE public.places (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('POI','BOARDING')),
  canonical_name text NOT NULL CHECK (length(btrim(canonical_name)) BETWEEN 1 AND 200),
  normalized_name text NOT NULL CHECK (length(btrim(normalized_name)) BETWEEN 1 AND 200),
  building_id uuid REFERENCES public.buildings(id) ON DELETE RESTRICT,
  category text REFERENCES public.poi_categories(code) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','ARCHIVED','MERGED')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (isfinite(created_at)),
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (isfinite(updated_at) AND updated_at >= created_at),
  merged_into uuid REFERENCES public.places(id) ON DELETE RESTRICT,
  data_kind text NOT NULL CHECK (data_kind IN ('SYNTHETIC','VERIFIED')),
  source_label text NOT NULL CHECK (length(btrim(source_label)) BETWEEN 1 AND 240),
  verified_at timestamptz,
  CHECK ((data_kind='SYNTHETIC' AND verified_at IS NULL AND canonical_name LIKE 'Synthetic%') OR
         (data_kind='VERIFIED' AND verified_at IS NOT NULL AND isfinite(verified_at))),
  CHECK ((kind='POI' AND category IS NOT NULL) OR (kind='BOARDING' AND category IS NULL)),
  -- A later boarding migration must supply consent/authority before public geometry.
  CHECK (kind='POI' OR building_id IS NULL),
  CHECK (merged_into IS DISTINCT FROM id),
  CHECK ((status='MERGED') = (merged_into IS NOT NULL)),
  UNIQUE (id, kind, status)
);
CREATE TABLE public.public_place_locations (
  place_id uuid PRIMARY KEY,
  place_kind text NOT NULL DEFAULT 'POI' CHECK (place_kind='POI'),
  place_status text NOT NULL DEFAULT 'ACTIVE' CHECK (place_status='ACTIVE'),
  entrance_geo geometry(Point,4326) NOT NULL CHECK (NOT ST_IsEmpty(entrance_geo) AND ST_IsValid(entrance_geo) AND
    ST_X(entrance_geo) BETWEEN -180 AND 180 AND ST_Y(entrance_geo) BETWEEN -90 AND 90),
  source text NOT NULL CHECK (length(btrim(source)) BETWEEN 1 AND 240),
  last_confirmed_at timestamptz CHECK (last_confirmed_at IS NULL OR isfinite(last_confirmed_at)),
  FOREIGN KEY (place_id, place_kind, place_status) REFERENCES public.places(id, kind, status) ON DELETE RESTRICT
);
CREATE TABLE public.place_source_refs (
  id uuid PRIMARY KEY,
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (length(btrim(provider)) BETWEEN 1 AND 100),
  external_id text CHECK (external_id IS NULL OR length(btrim(external_id)) BETWEEN 1 AND 240),
  source_version text CHECK (source_version IS NULL OR length(btrim(source_version)) BETWEEN 1 AND 120),
  license_tag text NOT NULL CHECK (length(btrim(license_tag)) BETWEEN 1 AND 160)
);
CREATE UNIQUE INDEX place_source_refs_provider_external_uidx ON public.place_source_refs(provider,external_id) WHERE external_id IS NOT NULL;
CREATE INDEX place_source_refs_place_idx ON public.place_source_refs(place_id);
CREATE TABLE public.place_aliases (
  id uuid PRIMARY KEY,
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE RESTRICT,
  alias text NOT NULL CHECK (length(btrim(alias)) BETWEEN 1 AND 200),
  normalized_alias text NOT NULL CHECK (length(btrim(normalized_alias)) BETWEEN 1 AND 200),
  UNIQUE (place_id, normalized_alias)
);
CREATE INDEX buildings_public_geo_idx ON public.buildings USING gist(public_geo);
CREATE INDEX public_place_locations_geo_idx ON public.public_place_locations USING gist(entrance_geo);
-- Names/coordinates are deliberately not identities: businesses may share them.
CREATE INDEX places_normalized_name_trgm_idx ON public.places USING gin(normalized_name gin_trgm_ops);
CREATE INDEX place_aliases_normalized_alias_trgm_idx ON public.place_aliases USING gin(normalized_alias gin_trgm_ops);
CREATE INDEX places_category_status_idx ON public.places(category,status,id);
CREATE INDEX places_building_idx ON public.places(building_id);
CREATE INDEX places_merged_into_idx ON public.places(merged_into);
