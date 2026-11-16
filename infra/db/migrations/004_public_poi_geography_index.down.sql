-- Removing this owned performance index never deletes a public location or POI.
DROP INDEX public.public_place_locations_geography_idx RESTRICT;
