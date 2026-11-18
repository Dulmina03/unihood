LOCK TABLE unihood_private.risk_evaluations IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM unihood_private.risk_evaluations) THEN
  RAISE EXCEPTION 'Risk evaluation rollback refused: populated history; preserve auditable decisions with a forward migration';
 END IF;
END
$rollback$;
DROP TABLE unihood_private.risk_evaluations RESTRICT;
