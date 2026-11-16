-- Never delete persistent POIs, categories, sources or aliases to force rollback.
LOCK TABLE public.poi_categories, public.buildings, public.places, public.public_place_locations,
  public.place_source_refs, public.place_aliases IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
  IF EXISTS (SELECT 1 FROM public.poi_categories) OR EXISTS (SELECT 1 FROM public.buildings) OR
     EXISTS (SELECT 1 FROM public.places) OR EXISTS (SELECT 1 FROM public.public_place_locations) OR
     EXISTS (SELECT 1 FROM public.place_source_refs) OR EXISTS (SELECT 1 FROM public.place_aliases) THEN
    RAISE EXCEPTION 'POI rollback refused: populated tables; preserve data and use a reviewed forward migration';
  END IF;
END
$rollback$;
DROP TABLE public.place_aliases RESTRICT;
DROP TABLE public.place_source_refs RESTRICT;
DROP TABLE public.public_place_locations RESTRICT;
DROP TABLE public.places RESTRICT;
DROP TABLE public.buildings RESTRICT;
DROP TABLE public.poi_categories RESTRICT;
