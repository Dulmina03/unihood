-- UNI-035: no existing unit, private evidence, extension or applied SQL replaced.
ALTER TABLE public.boarding_properties ADD COLUMN inventory_revision integer NOT NULL DEFAULT 0 CHECK(inventory_revision>=0);
ALTER TABLE public.boarding_units ADD COLUMN public_template text CHECK(public_template IN ('STUDY_ROOM','SHARED_ROOM'));
ALTER TABLE public.boarding_units ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision>0);
ALTER TABLE public.boarding_units ADD COLUMN price_revision integer NOT NULL DEFAULT 0 CHECK(price_revision>=0);
ALTER TABLE public.boarding_units ADD CONSTRAINT boarding_units_property_identity_key UNIQUE(id,boarding_id);
CREATE TABLE public.boarding_official_prices (
 id uuid PRIMARY KEY,
 boarding_id uuid NOT NULL,
 unit_id uuid NOT NULL,
 revision integer NOT NULL CHECK(revision>0),
 currency text NOT NULL CHECK(currency='LKR'),
 period text NOT NULL CHECK(period='MONTH'),
 basis text NOT NULL CHECK(basis IN ('ROOM','BED')),
 rent_minor bigint NOT NULL CHECK(rent_minor BETWEEN 0 AND 100000000000),
 deposit_minor bigint CHECK(deposit_minor BETWEEN 0 AND 100000000000),
 utility_terms text NOT NULL CHECK(utility_terms IN ('NOT_SHARED','INCLUDED','SEPARATE')),
 meal_terms text NOT NULL CHECK(meal_terms IN ('NOT_SHARED','INCLUDED','SEPARATE')),
 effective_at timestamptz NOT NULL CHECK(isfinite(effective_at)),
 recorded_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(recorded_at)),
 author_ref text NOT NULL CHECK(author_ref IN ('synthetic:owner-a','synthetic:price-manager-a')),
 change_reason text NOT NULL CHECK(change_reason IN ('INITIAL','CORRECTION','FEE_CHANGE')),
 UNIQUE(unit_id,revision),
 FOREIGN KEY(unit_id,boarding_id) REFERENCES public.boarding_units(id,boarding_id) ON DELETE RESTRICT
);
CREATE INDEX boarding_prices_current_idx ON public.boarding_official_prices(unit_id,effective_at DESC,revision DESC);
