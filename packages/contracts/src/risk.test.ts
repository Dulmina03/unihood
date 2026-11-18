import {describe,it,expect} from 'vitest';
import {RISK_RULE_VERSION,RISK_RULES,RiskSignalsSchema,evaluateRisk,riskSummary} from './risk';
import {ContributionHistoryItemSchema} from './poi-correction';

const base={
  contributionKind:'POI_PROPOSAL',targetKind:'POI',publicationKindEligible:true,publicWritesEnabled:true,
  evidence:{sourceConfidence:'SOURCE_CHECKED',hasEvidenceNote:true,evidenceRequired:false,observedWithinDays:true},
  duplicates:{pendingDuplicate:false,canonicalCollision:false},
  conflicts:{actorManagesTarget:false,activeSuppression:false,conflictingReports:0},
  submissionPattern:{recentSameActor:1,recentDistinctActors:1},
  content:{sensitivePrivateText:false,contactOrLink:false,officialFieldAttempt:false,residentialClaim:false,ownershipClaim:false,mediaUnmoderated:false},
  confirmations:{total:0,distinctActors:0},sensitiveReport:false,
} as const;
const withSignals=(patch:Record<string,unknown>)=>evaluateRisk({...base,...patch});
const decisions=(value:ReturnType<typeof evaluateRisk>)=>value.reasons.map(item=>item.rule);

describe('UNI-045 versioned risk rules',()=>{
  it('publishes only a clean, eligible, currently-gated open routine contribution',()=>{
    const value=withSignals({});
    expect(value.ruleVersion).toBe('risk-rules-v1');expect(value.decision).toBe('AUTO_PUBLISH');
    expect(value.riskLevel).toBe('LOW');expect(value.publicationEligible).toBe(true);expect(value.requiresReview).toBe(false);
    expect(decisions(value)).toEqual(['RR-019-ROUTINE-LOW-RISK']);
  });
  it('is deterministic for identical signals and exposes a frozen, ordered catalog',()=>{
    const first=withSignals({});const second=withSignals({});
    expect(second).toEqual(first);expect(RISK_RULE_VERSION).toBe('risk-rules-v1');
    expect(RISK_RULES.map(item=>item.id)).toEqual([...RISK_RULES.map(item=>item.id)].sort());
    expect(new Set(RISK_RULES.map(item=>item.id)).size).toBe(RISK_RULES.length);
  });
  it('holds routine contributions while the publication gate is closed',()=>{
    const value=withSignals({publicWritesEnabled:false});
    expect(value.decision).toBe('HOLD');expect(value.requiresReview).toBe(true);
    expect(decisions(value)).toEqual(['RR-018-PUBLICATION-GATE-CLOSED']);
  });
  it('never auto-publishes reviews, corrections, recommendations or reports',()=>{
    for(const kind of ['POI_CORRECTION','BOARDING_RECOMMENDATION','REVIEW','REPORT'] as const){
      const value=withSignals({contributionKind:kind,publicationKindEligible:false,...(kind==='REPORT'?{sensitiveReport:false}:{})});
      expect(value.decision).not.toBe('AUTO_PUBLISH');
      expect(value.publicationEligible).toBe(false);
    }
  });
  it('escalates official-field attempts, ownership claims, self-interest and sensitive reports',()=>{
    expect(withSignals({content:{...base.content,officialFieldAttempt:true}}).decision).toBe('ESCALATE');
    expect(withSignals({content:{...base.content,ownershipClaim:true}}).decision).toBe('ESCALATE');
    expect(withSignals({conflicts:{...base.conflicts,actorManagesTarget:true}}).decision).toBe('ESCALATE');
    expect(withSignals({contributionKind:'REPORT',publicationKindEligible:false,sensitiveReport:true}).riskLevel).toBe('HIGH');
  });
  it('requires evidence for private text, contacts, missing/stale evidence and unmoderated media',()=>{
    expect(withSignals({content:{...base.content,sensitivePrivateText:true}}).decision).toBe('NEEDS_EVIDENCE');
    expect(withSignals({content:{...base.content,contactOrLink:true}}).decision).toBe('NEEDS_EVIDENCE');
    expect(withSignals({evidence:{...base.evidence,evidenceRequired:true,hasEvidenceNote:false}}).decision).toBe('NEEDS_EVIDENCE');
    expect(withSignals({evidence:{...base.evidence,observedWithinDays:false}}).decision).toBe('NEEDS_EVIDENCE');
    expect(withSignals({content:{...base.content,mediaUnmoderated:true}}).decision).toBe('NEEDS_EVIDENCE');
  });
  it('treats votes and agreement as signals, never proof or authority',()=>{
    const votes=withSignals({evidence:{...base.evidence,hasEvidenceNote:false},confirmations:{total:8,distinctActors:8}});
    expect(votes.decision).toBe('NEEDS_EVIDENCE');expect(decisions(votes)).toContain('RR-010-AGREEMENT-NOT-EVIDENCE');
    const collusive=withSignals({evidence:{...base.evidence,hasEvidenceNote:true},confirmations:{total:6,distinctActors:2}});
    expect(collusive.decision).toBe('NEEDS_EVIDENCE');expect(decisions(collusive)).toContain('RR-011-COLLUSION-PATTERN');
    const many=withSignals({evidence:{...base.evidence,hasEvidenceNote:false},confirmations:{total:100,distinctActors:100}});
    expect(many.publicationEligible).toBe(false);
  });
  it('holds duplicates, conflicts, suppression, repeated submissions and reports without deleting content',()=>{
    expect(withSignals({duplicates:{pendingDuplicate:true,canonicalCollision:false}}).decision).toBe('HOLD');
    expect(withSignals({duplicates:{pendingDuplicate:false,canonicalCollision:true}}).decision).toBe('HOLD');
    expect(withSignals({conflicts:{...base.conflicts,conflictingReports:1}}).decision).toBe('HOLD');
    expect(withSignals({conflicts:{...base.conflicts,activeSuppression:true}}).decision).toBe('HOLD');
    expect(withSignals({submissionPattern:{recentSameActor:3,recentDistinctActors:1}}).decision).toBe('HOLD');
    expect(withSignals({contributionKind:'REPORT',publicationKindEligible:false,sensitiveReport:false}).decision).toBe('HOLD');
  });
  it('uses the strongest triggered reason and keeps report severity independent',()=>{
    const value=withSignals({content:{...base.content,sensitivePrivateText:true,contactOrLink:true},duplicates:{pendingDuplicate:true,canonicalCollision:true},conflicts:{...base.conflicts,conflictingReports:2}});
    expect(value.decision).toBe('NEEDS_EVIDENCE');
    expect(value.reasons.map(item=>item.decision)).toContain('HOLD');
    const summary=riskSummary(value);
    expect(summary.riskExplanation).toMatch(/verification/i);expect(summary).not.toHaveProperty('severity');expect(summary).not.toHaveProperty('score');
  });
  it('rejects unknown, raw-text or caller-controlled workflow fields',()=>{
    for(const extra of [{score:90},{decision:'AUTO_PUBLISH'},{riskLevel:'LOW'},{reviewerId:'synthetic:operator'},{text:'raw submission'},{votesGrantOwnership:true},{details:'secret'}])
      expect(RiskSignalsSchema.safeParse({...base,...extra}).success).toBe(false);
    for(const key of ['reason','evidence','coordinates','actorRef','severity'])expect(RiskSignalsSchema.safeParse({...base,[key]:'x'}).success).toBe(false);
  });
  it('keeps historical history rows valid while exposing only safe risk summaries',()=>{
    const legacy={id:'40000000-0000-4000-8000-000000000001',kind:'POI_PROPOSAL',state:'PENDING',createdAt:'2026-11-18T00:00:00Z',placeId:null,dataKind:'SYNTHETIC'};
    expect(ContributionHistoryItemSchema.safeParse(legacy).success).toBe(true);
    const summary=riskSummary(withSignals({publicWritesEnabled:false}));
    expect(ContributionHistoryItemSchema.safeParse({...legacy,state:'HELD',...summary}).success).toBe(true);
    expect(ContributionHistoryItemSchema.safeParse({...legacy,...summary,riskExplanation:'Synthetic contact 555-0100 raw'}).success).toBe(true);
    expect(ContributionHistoryItemSchema.safeParse({...legacy,...summary,riskReasons:['RR-999-UNKNOWN']}).success).toBe(false);
  });
});
