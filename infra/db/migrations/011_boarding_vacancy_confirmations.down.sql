LOCK TABLE public.boarding_units,public.boarding_vacancy_confirmations IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM public.boarding_vacancy_confirmations) OR EXISTS(SELECT 1 FROM public.boarding_units WHERE vacancy_revision<>0) THEN
  RAISE EXCEPTION 'Vacancy rollback refused: populated tables or changed metadata; preserve data and use a reviewed forward migration';
 END IF;
END
$rollback$;
DROP TABLE public.boarding_vacancy_confirmations RESTRICT;
ALTER TABLE public.boarding_units DROP COLUMN vacancy_revision RESTRICT;
