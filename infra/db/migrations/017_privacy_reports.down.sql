LOCK TABLE unihood_private.report_cases,unihood_private.report_appeals,unihood_private.report_suppressions,unihood_private.report_audit_events,public.route_segments IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM unihood_private.report_cases) OR EXISTS(SELECT 1 FROM unihood_private.report_appeals) OR EXISTS(SELECT 1 FROM unihood_private.report_audit_events) OR EXISTS(SELECT 1 FROM public.route_segments) THEN
  RAISE EXCEPTION 'Privacy report rollback refused: populated tables; preserve confidential case history with a forward migration';
 END IF;
END
$rollback$;
DROP TABLE public.route_segments RESTRICT;
DROP TABLE unihood_private.report_audit_events RESTRICT;
DROP TABLE unihood_private.report_suppressions RESTRICT;
DROP TABLE unihood_private.report_appeals RESTRICT;
DROP TABLE unihood_private.report_cases RESTRICT;
DROP TABLE unihood_private.public_projection_revisions RESTRICT;
