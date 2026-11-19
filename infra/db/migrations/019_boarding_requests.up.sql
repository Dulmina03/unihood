CREATE TABLE unihood_private.boarding_requests (
 id uuid PRIMARY KEY,
 requester_ref text NOT NULL CHECK(length(requester_ref) BETWEEN 1 AND 80),
 boarding_id uuid NOT NULL REFERENCES public.places(id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK(kind IN ('CONTACT_OWNER','REQUEST_LOCATION')),
 request_key uuid NOT NULL,
 payload_hash text NOT NULL CHECK(length(payload_hash)=64),
 status text NOT NULL DEFAULT 'MOCK_PENDING' CHECK(status='MOCK_PENDING'),
 data_kind text NOT NULL DEFAULT 'SYNTHETIC' CHECK(data_kind='SYNTHETIC'),
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(requester_ref,request_key),
 UNIQUE(requester_ref,boarding_id,kind)
);
CREATE INDEX boarding_requests_boarding_idx ON unihood_private.boarding_requests(boarding_id);
REVOKE ALL ON unihood_private.boarding_requests FROM PUBLIC;
