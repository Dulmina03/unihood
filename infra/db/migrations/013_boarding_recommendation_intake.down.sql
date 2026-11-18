LOCK TABLE unihood_private.boarding_recommendation_intake IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM unihood_private.boarding_recommendation_intake) THEN
  RAISE EXCEPTION 'Recommendation intake rollback refused: populated tables; preserve data and use a reviewed forward migration';
 END IF;
END
$rollback$;
DROP TABLE unihood_private.boarding_recommendation_intake RESTRICT;
