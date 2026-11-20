/**
 * Standalone helper for issue #1022: ClaimLookupProvider index-usage verification
 * for claim token hash lookups.
 *
 * Claim redemption resolves accounts by claim token hash. This helper encodes the
 * expected index/query contract so operators and tests can verify lookups use an
 * index (e.g. accounts.claimTokenHash / claims.accountId paths covered by
 * high-traffic index migrations) rather than a sequential scan.
 */

export const IBINOLA_1022_CLAIM_HASH_INDEX_TARGETS = [
  { table: 'accounts', column: 'claimTokenHash', purpose: 'lookup account by hashed claim token during redemption/verification' },
  { table: 'claims', column: 'accountId', purpose: 'join/lookup claim records by account' },
] as const;

export interface Ibinola1022ExplainPlan {
  planText: string;
}

export function ibinola1022PlanUsesIndex(plan: Ibinola1022ExplainPlan): boolean {
  const text = plan.planText.toLowerCase();
  const hasIndex = text.includes('index scan') || text.includes('index only scan') || text.includes('bitmap index scan');
  const hasSeqOnTarget = text.includes('seq scan on accounts') || text.includes('seq scan on claims');
  return hasIndex && !hasSeqOnTarget;
}

export function ibinola1022BuildClaimHashLookupExplainQuery(): string {
  // EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) should be run against a populated DB;
  // this query shape mirrors claim-token-hash account resolution.
  return "EXPLAIN (ANALYZE, BUFFERS) SELECT id, status, \"claimTokenHash\" FROM accounts WHERE \"claimTokenHash\" = $1 LIMIT 1;";
}

export function ibinola1022VerificationNotes(): string[] {
  return [
    'Confirm migration 1718100006000-AddHighTrafficIndexes (or equivalent) includes an index covering accounts.claimTokenHash.',
    'Run ibinola1022BuildClaimHashLookupExplainQuery() with a representative hash value and assert ibinola1022PlanUsesIndex() is true.',
    'If a sequential scan appears, add/adjust an index on accounts("claimTokenHash") and re-run EXPLAIN.',
  ];
}
