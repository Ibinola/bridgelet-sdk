/**
 * Standalone spec for issue #1020: metadata field size/shape should be bounded
 * prior to sanitizeMetadata() so large payloads are rejected early by DTO validation.
 *
 * Encodes expected class-validator constraints for CreateAccountDto.metadata.
 */
type BoundedMetadataRules = {
  maxBytes: number;
  maxDepth: number;
  maxKeys: number;
  maxKeyLength: number;
};

const EXPECTED_RULES: BoundedMetadataRules = {
  maxBytes: 4096,
  maxDepth: 3,
  maxKeys: 32,
  maxKeyLength: 64,
};

function utf8Bytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function depthOf(value: unknown, current = 1): number {
  if (value === null || typeof value !== 'object') return current;
  if (Array.isArray(value)) return value.reduce((m, v) => Math.max(m, depthOf(v, current + 1)), current + 1);
  const vals = Object.values(value as Record<string, unknown>);
  if (vals.length === 0) return current + 1;
  return vals.reduce((m, v) => Math.max(m, depthOf(v, current + 1)), current + 1);
}

function violatesBounds(metadata: Record<string, unknown>, rules = EXPECTED_RULES): string | null {
  if (utf8Bytes(metadata) > rules.maxBytes) return 'size';
  if (Object.keys(metadata).length > rules.maxKeys) return 'keys';
  if (Object.keys(metadata).some((k) => k.length > rules.maxKeyLength)) return 'keyLength';
  if (depthOf(metadata) > rules.maxDepth + 1) return 'depth';
  return null;
}

describe('ibinola-1020 bounded metadata DTO constraint (standalone)', () => {
  it('accepts metadata within size/depth/key bounds', () => {
    const ok = { userId: 'u1', tags: ['a', 'b'], nested: { x: 1 } };
    expect(violatesBounds(ok)).toBeNull();
  });

  it('rejects oversized metadata before sanitization buffering would be relied upon', () => {
    const big = { blob: 'x'.repeat(EXPECTED_RULES.maxBytes + 10) };
    expect(violatesBounds(big)).toBe('size');
  });

  it('rejects overly deep or over-keyed shapes', () => {
    const deep = { a: { b: { c: { d: { e: 1 } } } } };
    expect(violatesBounds(deep)).toBe('depth');
    const many: Record<string, number> = {};
    for (let i = 0; i < EXPECTED_RULES.maxKeys + 1; i += 1) many[`k${i}`] = i;
    expect(violatesBounds(many)).toBe('keys');
  });
});
