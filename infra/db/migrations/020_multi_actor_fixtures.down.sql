DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM unihood_private.review_intake WHERE actor_ref='synthetic:contributor-b')
  OR EXISTS(SELECT 1 FROM unihood_private.report_cases WHERE reporter_ref='synthetic:contributor-b')
  OR EXISTS(SELECT 1 FROM unihood_private.report_appeals WHERE appellant_ref='synthetic:contributor-b')
  OR EXISTS(SELECT 1 FROM unihood_private.report_audit_events WHERE actor_ref='synthetic:contributor-b')
  OR EXISTS(SELECT 1 FROM unihood_private.boarding_privacy_events WHERE actor_ref='synthetic:owner-b') THEN
  RAISE EXCEPTION 'Multi-actor fixture rollback refused: rows use synthetic:contributor-b or synthetic:owner-b; preserve them with a forward migration';
 END IF;
END
$rollback$;
ALTER TABLE unihood_private.review_intake DROP CONSTRAINT review_intake_actor_ref_check;
ALTER TABLE unihood_private.review_intake ADD CONSTRAINT review_intake_actor_ref_check CHECK(actor_ref IN ('synthetic:contributor','synthetic:owner-a','synthetic:price-manager-a'));
ALTER TABLE unihood_private.report_cases DROP CONSTRAINT report_cases_reporter_ref_check;
ALTER TABLE unihood_private.report_cases ADD CONSTRAINT report_cases_reporter_ref_check CHECK(reporter_ref IN ('synthetic:contributor','synthetic:owner-a','synthetic:price-manager-a'));
ALTER TABLE unihood_private.report_appeals DROP CONSTRAINT report_appeals_appellant_ref_check;
ALTER TABLE unihood_private.report_appeals ADD CONSTRAINT report_appeals_appellant_ref_check CHECK(appellant_ref IN ('synthetic:contributor','synthetic:owner-a','synthetic:price-manager-a'));
ALTER TABLE unihood_private.report_audit_events DROP CONSTRAINT report_audit_events_actor_ref_check;
ALTER TABLE unihood_private.report_audit_events ADD CONSTRAINT report_audit_events_actor_ref_check CHECK(actor_ref IN ('synthetic:contributor','synthetic:owner-a','synthetic:price-manager-a','synthetic:operator'));
ALTER TABLE unihood_private.boarding_privacy_events DROP CONSTRAINT boarding_privacy_events_actor_ref_check;
ALTER TABLE unihood_private.boarding_privacy_events ADD CONSTRAINT boarding_privacy_events_actor_ref_check CHECK(actor_ref='synthetic:owner-a');
