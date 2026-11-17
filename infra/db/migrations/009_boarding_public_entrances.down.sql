LOCK TABLE public.boarding_advertisement_previews,public.boarding_public_entrances,unihood_private.boarding_visibility_events IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM public.boarding_public_entrances) OR EXISTS(SELECT 1 FROM unihood_private.boarding_visibility_events) OR EXISTS(SELECT 1 FROM public.boarding_advertisement_previews WHERE visibility='PUBLIC_MAP') THEN
  RAISE EXCEPTION 'Public entrance rollback refused: populated tables; preserve data and use a reviewed forward migration';
 END IF;
END
$rollback$;
DROP TABLE public.boarding_public_entrances RESTRICT;
DROP TABLE unihood_private.boarding_visibility_events RESTRICT;
ALTER TABLE public.boarding_advertisement_previews DROP CONSTRAINT boarding_advertisement_previews_visibility_check RESTRICT;
ALTER TABLE public.boarding_advertisement_previews DROP CONSTRAINT boarding_advertisement_previews_mode_locality_check RESTRICT;
ALTER TABLE public.boarding_advertisement_previews ADD CONSTRAINT boarding_advertisement_previews_visibility_check CHECK(visibility IN ('AREA_ONLY','HIDDEN'));
ALTER TABLE public.boarding_advertisement_previews ADD CONSTRAINT boarding_advertisement_previews_check CHECK((visibility='HIDDEN' AND locality IS NULL) OR (visibility='AREA_ONLY' AND locality IS NOT NULL));
