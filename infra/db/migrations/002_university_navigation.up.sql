-- UNI-010: no identity, property or private residential data in these public models.
CREATE TABLE public.universities (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (length(slug) BETWEEN 1 AND 100 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  city text NOT NULL CHECK (length(btrim(city)) BETWEEN 1 AND 160),
  country text NOT NULL CHECK (country ~ '^[A-Z]{2}$'),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  data_kind text NOT NULL CHECK (data_kind IN ('SYNTHETIC','VERIFIED')),
  source_label text NOT NULL CHECK (length(btrim(source_label)) BETWEEN 1 AND 160),
  verified_at timestamptz,
  CHECK ((data_kind='SYNTHETIC' AND verified_at IS NULL AND name LIKE 'Synthetic%') OR
         (data_kind='VERIFIED' AND verified_at IS NOT NULL AND isfinite(verified_at)))
);
CREATE TABLE public.campuses (
  id uuid PRIMARY KEY,
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  public_area text CHECK (public_area IS NULL OR length(btrim(public_area)) BETWEEN 1 AND 160),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  data_kind text NOT NULL CHECK (data_kind IN ('SYNTHETIC','VERIFIED')),
  source_label text NOT NULL CHECK (length(btrim(source_label)) BETWEEN 1 AND 160),
  verified_at timestamptz,
  CHECK ((data_kind='SYNTHETIC' AND verified_at IS NULL AND name LIKE 'Synthetic%') OR
         (data_kind='VERIFIED' AND verified_at IS NOT NULL AND isfinite(verified_at)))
);
CREATE INDEX campuses_university_idx ON public.campuses(university_id, name, id);
CREATE TABLE public.campus_entrances (
  id uuid PRIMARY KEY,
  campus_id uuid NOT NULL REFERENCES public.campuses(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  -- Geometry checks reject invalid input rather than geography's coordinate normalization.
  geo geometry(Point,4326) NOT NULL CHECK (NOT ST_IsEmpty(geo) AND ST_IsValid(geo) AND
    ST_X(geo) BETWEEN -180 AND 180 AND ST_Y(geo) BETWEEN -90 AND 90),
  is_primary boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  data_kind text NOT NULL CHECK (data_kind IN ('SYNTHETIC','VERIFIED')),
  source_label text NOT NULL CHECK (length(btrim(source_label)) BETWEEN 1 AND 160),
  verified_at timestamptz,
  CHECK ((data_kind='SYNTHETIC' AND verified_at IS NULL AND name LIKE 'Synthetic%') OR
         (data_kind='VERIFIED' AND verified_at IS NOT NULL AND isfinite(verified_at)))
);
CREATE INDEX campus_entrances_campus_idx ON public.campus_entrances(campus_id, name, id);
CREATE INDEX campus_entrances_geo_idx ON public.campus_entrances USING gist (geo);
CREATE UNIQUE INDEX campus_one_active_primary ON public.campus_entrances(campus_id) WHERE is_primary AND status='ACTIVE';
