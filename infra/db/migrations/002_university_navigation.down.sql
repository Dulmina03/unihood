-- Never silently remove persistent rows, including synthetic rows. No CASCADE.
LOCK TABLE public.universities, public.campuses, public.campus_entrances IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
  IF EXISTS (SELECT 1 FROM public.campus_entrances) OR EXISTS (SELECT 1 FROM public.campuses) OR EXISTS (SELECT 1 FROM public.universities) THEN
    RAISE EXCEPTION 'University rollback refused: populated tables; preserve data and use a reviewed forward migration';
  END IF;
END
$rollback$;
DROP TABLE public.campus_entrances RESTRICT;
DROP TABLE public.campuses RESTRICT;
DROP TABLE public.universities RESTRICT;
