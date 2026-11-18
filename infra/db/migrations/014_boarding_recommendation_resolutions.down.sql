LOCK TABLE unihood_private.boarding_recommendation_resolutions IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM unihood_private.boarding_recommendation_resolutions) THEN
  RAISE EXCEPTION 'Recommendation resolution rollback refused: populated tables; preserve associations and use a reviewed forward migration';
 END IF;
END
$rollback$;
DROP TABLE unihood_private.boarding_recommendation_resolutions RESTRICT;
