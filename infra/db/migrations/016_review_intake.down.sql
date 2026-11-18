LOCK TABLE unihood_private.review_intake IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM unihood_private.review_intake) THEN
  RAISE EXCEPTION 'Review intake rollback refused: populated tables; preserve contribution history with a forward migration';
 END IF;
END
$rollback$;
DROP TABLE unihood_private.review_intake RESTRICT;
