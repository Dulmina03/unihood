LOCK TABLE unihood_private.poi_correction_intake IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM unihood_private.poi_correction_intake) THEN
  RAISE EXCEPTION 'POI correction rollback refused: populated tables; preserve contribution history with a forward migration';
 END IF;
END
$rollback$;
DROP TABLE unihood_private.poi_correction_intake RESTRICT;
