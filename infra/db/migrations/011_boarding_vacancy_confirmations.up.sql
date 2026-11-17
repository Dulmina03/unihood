-- UNI-036: append-only through API, separate from raw legacy counts and geography.
ALTER TABLE public.boarding_units ADD COLUMN vacancy_revision integer NOT NULL DEFAULT 0 CHECK(vacancy_revision>=0);
CREATE TABLE public.boarding_vacancy_confirmations (
 id uuid PRIMARY KEY,
 boarding_id uuid NOT NULL,
 unit_id uuid NOT NULL,
 revision integer NOT NULL CHECK(revision>0),
 unit_revision integer NOT NULL CHECK(unit_revision>0),
 capacity_snapshot integer NOT NULL CHECK(capacity_snapshot BETWEEN 0 AND 10000),
 status text NOT NULL CHECK(status IN ('AVAILABLE','FULL','UNKNOWN')),
 available_beds integer CHECK(available_beds BETWEEN 0 AND capacity_snapshot),
 confirmed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(confirmed_at)),
 expires_at timestamptz NOT NULL CHECK(isfinite(expires_at) AND expires_at>confirmed_at),
 author_ref text NOT NULL CHECK(author_ref='synthetic:owner-a'),
 change_reason text NOT NULL CHECK(change_reason IN ('INITIAL','RECONFIRMATION','STATUS_CHANGE','CORRECTION')),
 CHECK((status='AVAILABLE' AND available_beds IS NOT NULL AND available_beds>0) OR (status='FULL' AND available_beds IS NOT NULL AND available_beds=0) OR (status='UNKNOWN' AND available_beds IS NULL)),
 UNIQUE(unit_id,revision),
 FOREIGN KEY(unit_id,boarding_id) REFERENCES public.boarding_units(id,boarding_id) ON DELETE RESTRICT
);
