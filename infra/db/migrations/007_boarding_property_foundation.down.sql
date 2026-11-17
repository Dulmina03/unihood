LOCK TABLE public.boarding_properties,public.boarding_units,public.listings,public.listing_media,
  unihood_private.boarding_building_links,unihood_private.boarding_locations,unihood_private.media_assets IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM public.boarding_properties) OR EXISTS(SELECT 1 FROM public.boarding_units) OR
    EXISTS(SELECT 1 FROM public.listings) OR EXISTS(SELECT 1 FROM public.listing_media) OR
    EXISTS(SELECT 1 FROM unihood_private.boarding_building_links) OR EXISTS(SELECT 1 FROM unihood_private.boarding_locations) OR
    EXISTS(SELECT 1 FROM unihood_private.media_assets) THEN
  RAISE EXCEPTION 'Boarding foundation rollback refused: populated tables; preserve data and use a reviewed forward migration';
 END IF;
END
$rollback$;
DROP TABLE public.listing_media RESTRICT;
DROP TABLE unihood_private.media_assets RESTRICT;
DROP TABLE public.listings RESTRICT;
DROP TABLE public.boarding_units RESTRICT;
DROP TABLE unihood_private.boarding_locations RESTRICT;
DROP TABLE unihood_private.boarding_building_links RESTRICT;
DROP TABLE public.boarding_properties RESTRICT;
DROP SCHEMA unihood_private RESTRICT;
ALTER TABLE public.places DROP CONSTRAINT places_boarding_identity_key RESTRICT;
