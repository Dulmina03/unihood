LOCK TABLE unihood_private.boarding_requests IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM unihood_private.boarding_requests) THEN
  RAISE EXCEPTION 'Boarding request rollback refused: populated mock request history; preserve it with a forward migration';
 END IF;
END
$rollback$;
DROP TABLE unihood_private.boarding_requests RESTRICT;
