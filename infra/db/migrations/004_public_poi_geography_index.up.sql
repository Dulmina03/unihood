-- Geometry indexes serve public bbox reads; metre-based duplicate candidates
-- need the matching geography expression. No row, consent or extension changes.
CREATE INDEX public_place_locations_geography_idx
  ON public.public_place_locations USING gist ((entrance_geo::geography));
