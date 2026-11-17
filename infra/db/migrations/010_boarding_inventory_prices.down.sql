LOCK TABLE public.boarding_properties,public.boarding_units,public.boarding_official_prices IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM public.boarding_official_prices) OR EXISTS(SELECT 1 FROM public.boarding_properties WHERE inventory_revision<>0) OR EXISTS(SELECT 1 FROM public.boarding_units WHERE public_template IS NOT NULL OR revision<>1 OR price_revision<>0) THEN
  RAISE EXCEPTION 'Inventory pricing rollback refused: populated tables or changed metadata; preserve data and use a reviewed forward migration';
 END IF;
END
$rollback$;
DROP TABLE public.boarding_official_prices RESTRICT;
ALTER TABLE public.boarding_units DROP CONSTRAINT boarding_units_property_identity_key RESTRICT;
ALTER TABLE public.boarding_units DROP COLUMN price_revision RESTRICT;
ALTER TABLE public.boarding_units DROP COLUMN revision RESTRICT;
ALTER TABLE public.boarding_units DROP COLUMN public_template RESTRICT;
ALTER TABLE public.boarding_properties DROP COLUMN inventory_revision RESTRICT;
