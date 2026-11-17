-- UNI-026: server-assigned review metadata, never permission to publish.
ALTER TABLE public.poi_pending_proposals
  ADD COLUMN source_note text CHECK (source_note IS NULL OR length(btrim(source_note)) BETWEEN 8 AND 240),
  ADD COLUMN review_state text NOT NULL DEFAULT 'PENDING' CHECK (review_state IN ('PENDING','NEEDS_EVIDENCE')),
  ADD COLUMN risk_flags text[] NOT NULL DEFAULT '{}' CHECK (cardinality(risk_flags)<=3 AND array_position(risk_flags,NULL) IS NULL
    AND risk_flags <@ ARRAY['PRIVATE_TEXT','CONTACT_TEXT','EXTERNAL_REFERENCE']::text[]),
  ADD CONSTRAINT poi_proposal_review_consistency CHECK ((review_state='PENDING' AND cardinality(risk_flags)=0)
    OR (review_state='NEEDS_EVIDENCE' AND cardinality(risk_flags)>0));
