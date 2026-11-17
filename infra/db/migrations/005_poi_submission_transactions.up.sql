-- UNI-025: private synthetic pending intents, never published map geometry.
CREATE TABLE public.poi_pending_proposals (
  id uuid PRIMARY KEY,
  actor_ref text NOT NULL CHECK (length(actor_ref) BETWEEN 11 AND 160 AND actor_ref LIKE 'synthetic:%'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200 AND name LIKE 'Synthetic%'),
  normalized_name text NOT NULL CHECK (length(normalized_name) BETWEEN 1 AND 200),
  category text NOT NULL REFERENCES public.poi_categories(code) ON DELETE RESTRICT,
  public_entrance geometry(Point,4326) NOT NULL CHECK (NOT ST_IsEmpty(public_entrance) AND ST_IsValid(public_entrance)
    AND ST_X(public_entrance) BETWEEN -180 AND 180 AND ST_Y(public_entrance) BETWEEN -90 AND 90),
  distinct_reason text NOT NULL CHECK (length(btrim(distinct_reason)) BETWEEN 15 AND 500),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status='PENDING'),
  data_kind text NOT NULL DEFAULT 'SYNTHETIC' CHECK (data_kind='SYNTHETIC'),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (isfinite(created_at))
);
CREATE INDEX poi_pending_proposals_geography_idx ON public.poi_pending_proposals USING gist ((public_entrance::geography));
CREATE INDEX poi_pending_proposals_name_idx ON public.poi_pending_proposals USING gin (normalized_name gin_trgm_ops);
CREATE TABLE public.poi_pending_source_refs (
  proposal_id uuid NOT NULL REFERENCES public.poi_pending_proposals(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (length(btrim(provider)) BETWEEN 1 AND 100),
  external_id text NOT NULL CHECK (length(btrim(external_id)) BETWEEN 1 AND 240),
  license_tag text NOT NULL CHECK (length(btrim(license_tag)) BETWEEN 1 AND 160),
  PRIMARY KEY (provider,external_id)
);
CREATE INDEX poi_pending_source_refs_proposal_idx ON public.poi_pending_source_refs(proposal_id);
CREATE TABLE public.poi_submission_requests (
  actor_ref text NOT NULL CHECK (length(actor_ref) BETWEEN 11 AND 160 AND actor_ref LIKE 'synthetic:%'),
  idempotency_key uuid NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  result jsonb NOT NULL CHECK (jsonb_typeof(result)='object'),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (isfinite(created_at)),
  PRIMARY KEY (actor_ref,idempotency_key)
);
-- A cross-table source claim must serialize even when a direct canonical writer
-- is used. Fail closed for snapshot isolation that cannot see a waited-on claim.
CREATE FUNCTION public.unihood_guard_pending_poi_source() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
BEGIN
  IF NEW.external_id IS NULL THEN RETURN NEW; END IF;
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'Source claims require read committed coordination' USING ERRCODE='23514';
  END IF;
  PERFORM pg_advisory_xact_lock(25025,1);
  IF TG_TABLE_NAME='poi_pending_source_refs' THEN
    IF EXISTS(SELECT 1 FROM public.place_source_refs WHERE provider=NEW.provider AND external_id=NEW.external_id) THEN
      RAISE EXCEPTION 'Source identity is already reserved' USING ERRCODE='23505';
    END IF;
  ELSE
    IF EXISTS(SELECT 1 FROM public.poi_pending_source_refs WHERE provider=NEW.provider AND external_id=NEW.external_id) THEN
      RAISE EXCEPTION 'Source identity is already reserved' USING ERRCODE='23505';
    END IF;
  END IF;
  RETURN NEW;
END
$guard$;
LOCK TABLE public.place_source_refs IN SHARE ROW EXCLUSIVE MODE;
CREATE TRIGGER poi_pending_source_identity_guard BEFORE INSERT OR UPDATE OF provider,external_id ON public.poi_pending_source_refs
  FOR EACH ROW EXECUTE FUNCTION public.unihood_guard_pending_poi_source();
CREATE TRIGGER poi_canonical_source_identity_guard BEFORE INSERT OR UPDATE OF provider,external_id ON public.place_source_refs
  FOR EACH ROW EXECUTE FUNCTION public.unihood_guard_pending_poi_source();
