LOCK TABLE public.boarding_advertisement_previews IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM public.boarding_advertisement_previews) THEN
  RAISE EXCEPTION 'Advertisement preview rollback refused: populated table; preserve data and use a reviewed forward migration';
 END IF;
END
$rollback$;
DROP TABLE public.boarding_advertisement_previews RESTRICT;
ALTER TABLE public.listings DROP CONSTRAINT listings_property_identity_key RESTRICT;
