LOCK TABLE unihood_private.boarding_media,unihood_private.boarding_contacts,unihood_private.boarding_privacy_events IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM unihood_private.boarding_media) OR EXISTS(SELECT 1 FROM unihood_private.boarding_contacts) OR EXISTS(SELECT 1 FROM unihood_private.boarding_privacy_events) THEN
  RAISE EXCEPTION 'Media/contact rollback refused: populated tables; preserve data and use a reviewed forward migration';
 END IF;
END
$rollback$;
DROP TABLE unihood_private.boarding_privacy_events RESTRICT;
DROP TABLE unihood_private.boarding_contacts RESTRICT;
DROP TABLE unihood_private.boarding_media RESTRICT;
