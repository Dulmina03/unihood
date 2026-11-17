LOCK TABLE public.place_source_refs,public.poi_submission_requests,public.poi_pending_source_refs,public.poi_pending_proposals IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
  IF EXISTS(SELECT 1 FROM public.poi_submission_requests) OR EXISTS(SELECT 1 FROM public.poi_pending_source_refs) OR EXISTS(SELECT 1 FROM public.poi_pending_proposals) THEN
    RAISE EXCEPTION 'Cannot roll back populated tables; preserve pending data and use a reviewed forward migration';
  END IF;
END
$rollback$;
DROP TRIGGER poi_canonical_source_identity_guard ON public.place_source_refs;
DROP TRIGGER poi_pending_source_identity_guard ON public.poi_pending_source_refs;
DROP FUNCTION public.unihood_guard_pending_poi_source() RESTRICT;
DROP TABLE public.poi_submission_requests RESTRICT;
DROP TABLE public.poi_pending_source_refs RESTRICT;
DROP TABLE public.poi_pending_proposals RESTRICT;
