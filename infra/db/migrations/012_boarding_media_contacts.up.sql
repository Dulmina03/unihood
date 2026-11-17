-- UNI-037: private synthetic quarantine/contact records, no publication or real-data grant.
CREATE TABLE unihood_private.boarding_media (
 asset_id uuid PRIMARY KEY,
 retained_asset_id uuid UNIQUE REFERENCES unihood_private.media_assets(id) ON DELETE RESTRICT,
 boarding_id uuid NOT NULL REFERENCES public.boarding_properties(place_id) ON DELETE RESTRICT,
 request_key uuid NOT NULL,
 object_key text NOT NULL UNIQUE CHECK(object_key=asset_id::text||'.webp'),
 storage_namespace text NOT NULL CHECK(storage_namespace ~ '^[a-f0-9]{64}$'),
 checksum text NOT NULL CHECK(checksum ~ '^[a-f0-9]{64}$'),
 bytes integer NOT NULL CHECK(bytes BETWEEN 1 AND 5242880),
 width integer NOT NULL CHECK(width BETWEEN 1 AND 2048),
 height integer NOT NULL CHECK(height BETWEEN 1 AND 2048),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 state text NOT NULL DEFAULT 'STAGING' CHECK(state IN ('STAGING','ACTIVE','REVOKED')),
 cleanup_pending boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(created_at)),
 UNIQUE(boarding_id,request_key),
 CHECK((state='STAGING' AND retained_asset_id IS NULL AND NOT cleanup_pending) OR (state='ACTIVE' AND retained_asset_id IS NOT NULL AND retained_asset_id=asset_id AND NOT cleanup_pending) OR (state='REVOKED' AND (retained_asset_id IS NULL OR retained_asset_id=asset_id)))
);
CREATE INDEX boarding_media_property_idx ON unihood_private.boarding_media(boarding_id,asset_id);
CREATE TABLE unihood_private.boarding_contacts (
 boarding_id uuid PRIMARY KEY REFERENCES public.boarding_properties(place_id) ON DELETE RESTRICT,
 revision integer NOT NULL CHECK(revision>0),
 state text NOT NULL CHECK(state IN ('PRIVATE','REMOVED')),
 ciphertext bytea,
 iv bytea CHECK(iv IS NULL OR octet_length(iv)=12),
 auth_tag bytea CHECK(auth_tag IS NULL OR octet_length(auth_tag)=16),
 key_version text CHECK(key_version IS NULL OR key_version='LOCAL_TEST_V1'),
 public_consent boolean NOT NULL DEFAULT false,
 verification_status text NOT NULL DEFAULT 'UNVERIFIED' CHECK(verification_status='UNVERIFIED'),
 updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(updated_at)),
 CHECK((state='PRIVATE' AND ciphertext IS NOT NULL AND octet_length(ciphertext)>0 AND iv IS NOT NULL AND auth_tag IS NOT NULL AND key_version IS NOT NULL) OR (state='REMOVED' AND ciphertext IS NULL AND iv IS NULL AND auth_tag IS NULL AND key_version IS NULL AND NOT public_consent))
);
CREATE TABLE unihood_private.boarding_privacy_events (
 id uuid PRIMARY KEY,
 boarding_id uuid NOT NULL REFERENCES public.boarding_properties(place_id) ON DELETE RESTRICT,
 actor_ref text NOT NULL CHECK(actor_ref='synthetic:owner-a'),
 event_type text NOT NULL CHECK(event_type IN ('MEDIA_UPLOAD_STAGED','MEDIA_QUARANTINED','MEDIA_CONSENT_REVOKED','PRIVATE_CONTACT_SET','PRIVATE_CONTACT_REMOVED')),
 asset_ref uuid REFERENCES unihood_private.boarding_media(asset_id) ON DELETE RESTRICT,
 occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(occurred_at)),
 CHECK((event_type IN ('MEDIA_UPLOAD_STAGED','MEDIA_QUARANTINED','MEDIA_CONSENT_REVOKED') AND asset_ref IS NOT NULL) OR (event_type IN ('PRIVATE_CONTACT_SET','PRIVATE_CONTACT_REMOVED') AND asset_ref IS NULL))
);
CREATE INDEX boarding_privacy_events_property_idx ON unihood_private.boarding_privacy_events(boarding_id,occurred_at DESC,id);
REVOKE ALL ON unihood_private.boarding_media,unihood_private.boarding_contacts,unihood_private.boarding_privacy_events FROM PUBLIC;
