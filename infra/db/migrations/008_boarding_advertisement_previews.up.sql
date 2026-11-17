-- Curated synthetic public text is separate from unreviewed property/listing content.
-- No production publication writer or real-owner authority is introduced.
ALTER TABLE public.listings ADD CONSTRAINT listings_property_identity_key UNIQUE(id,boarding_id);
CREATE TABLE public.boarding_advertisement_previews (
 listing_id uuid PRIMARY KEY,
 boarding_id uuid NOT NULL,
 data_kind text NOT NULL DEFAULT 'SYNTHETIC' CHECK(data_kind='SYNTHETIC'),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 160 AND title LIKE 'Synthetic %'),
 summary text NOT NULL CHECK(length(btrim(summary)) BETWEEN 1 AND 800),
 visibility text NOT NULL CHECK(visibility IN ('AREA_ONLY','HIDDEN')),
 locality text CHECK(locality IS NULL OR length(btrim(locality)) BETWEEN 1 AND 160),
 updated_at timestamptz NOT NULL CHECK(isfinite(updated_at)),
 FOREIGN KEY(listing_id,boarding_id) REFERENCES public.listings(id,boarding_id) ON DELETE RESTRICT,
 CHECK((visibility='HIDDEN' AND locality IS NULL) OR (visibility='AREA_ONLY' AND locality IS NOT NULL))
);
