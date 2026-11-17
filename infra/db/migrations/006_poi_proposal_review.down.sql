LOCK TABLE public.poi_pending_proposals IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
  IF EXISTS(SELECT 1 FROM public.poi_pending_proposals WHERE source_note IS NOT NULL OR review_state<>'PENDING' OR cardinality(risk_flags)>0) THEN
    RAISE EXCEPTION 'Cannot roll back populated proposal review metadata; preserve data and use a reviewed forward migration';
  END IF;
END
$rollback$;
ALTER TABLE public.poi_pending_proposals DROP CONSTRAINT poi_proposal_review_consistency;
ALTER TABLE public.poi_pending_proposals DROP COLUMN risk_flags RESTRICT, DROP COLUMN review_state RESTRICT, DROP COLUMN source_note RESTRICT;
