-- UNI-045 versioned workflow risk evaluations. Signals are derived server-side;
-- no raw submission text, evidence, identity, coordinates or score is stored.
CREATE TABLE unihood_private.risk_evaluations (
 id uuid PRIMARY KEY,
 contribution_kind text NOT NULL CHECK(contribution_kind IN ('POI_CORRECTION','POI_PROPOSAL','BOARDING_RECOMMENDATION','REVIEW','REPORT')),
 contribution_id uuid NOT NULL,
 rule_version text NOT NULL CHECK(rule_version='risk-rules-v1'),
 decision text NOT NULL CHECK(decision IN ('AUTO_PUBLISH','HOLD','NEEDS_EVIDENCE','ESCALATE')),
 risk_level text NOT NULL CHECK(risk_level IN ('LOW','ELEVATED','HIGH')),
 reasons text[] NOT NULL CHECK(cardinality(reasons) BETWEEN 1 AND 19 AND reasons <@ ARRAY[
  'RR-001-OWNER-CONTROLLED-FIELD','RR-002-OWNERSHIP-CLAIM','RR-003-SELF-INTEREST','RR-004-SENSITIVE-REPORT',
  'RR-005-PRIVATE-TEXT','RR-006-CONTACT-OR-LINK','RR-007-EVIDENCE-INSUFFICIENT','RR-008-STALE-OBSERVATION',
  'RR-009-MEDIA-UNMODERATED','RR-010-AGREEMENT-NOT-EVIDENCE','RR-011-COLLUSION-PATTERN','RR-012-REPORT-SUPPRESSION-ACTIVE',
  'RR-013-DUPLICATE-OR-CONFLICT','RR-014-CONFLICTING-REPORTS','RR-015-REPEATED-SUBMISSIONS','RR-016-REPORT-CASE',
  'RR-017-KIND-NOT-PUBLISHABLE','RR-018-PUBLICATION-GATE-CLOSED','RR-019-ROUTINE-LOW-RISK']::text[]),
 explanation text NOT NULL CHECK(char_length(explanation) BETWEEN 8 AND 240),
 evaluated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK(isfinite(evaluated_at)),
 UNIQUE(contribution_kind,contribution_id),
 CHECK((decision='AUTO_PUBLISH')=(risk_level='LOW'))
);
CREATE INDEX risk_evaluations_decision_idx ON unihood_private.risk_evaluations(decision,evaluated_at DESC,id);
REVOKE ALL ON unihood_private.risk_evaluations FROM PUBLIC;
