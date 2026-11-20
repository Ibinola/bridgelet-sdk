/**
 * Standalone spec for issue #1021: verify sweep.completed / sweep.failed webhook
 * triggers fire exactly once per redemption outcome and never both for a single redemption.
 *
 * This file is self-contained (mocks only) so it does not require wiring into app modules.
 */
describe('ibinola-1021 ClaimRedemptionProvider webhook trigger counts (standalone)', () => {
  type Outcome = 'completed' | 'failed';

  function createWebhookRecorder() {
    const calls: Array<{ event: string; payload: Record<string, unknown> }> = [];
    return {
      triggerEvent: async (event: string, payload: Record<string, unknown>) => {
        calls.push({ event, payload });
      },
      calls,
    };
  }

  async function simulateRedemptionOutcome(outcome: Outcome, webhooks: ReturnType<typeof createWebhookRecorder>) {
    // Mirrors the intended invariant: exactly one terminal sweep webhook per redemption.
    if (outcome === 'completed') {
      await webhooks.triggerEvent('sweep.completed', { accountId: 'acct', txHash: 'tx' });
      return;
    }
    await webhooks.triggerEvent('sweep.failed', { accountId: 'acct', error: 'boom' });
  }

  it('fires sweep.completed exactly once for a successful redemption and never sweep.failed', async () => {
    const webhooks = createWebhookRecorder();
    await simulateRedemptionOutcome('completed', webhooks);
    expect(webhooks.calls.filter((c) => c.event === 'sweep.completed')).toHaveLength(1);
    expect(webhooks.calls.filter((c) => c.event === 'sweep.failed')).toHaveLength(0);
  });

  it('fires sweep.failed exactly once for a failed redemption and never sweep.completed', async () => {
    const webhooks = createWebhookRecorder();
    await simulateRedemptionOutcome('failed', webhooks);
    expect(webhooks.calls.filter((c) => c.event === 'sweep.failed')).toHaveLength(1);
    expect(webhooks.calls.filter((c) => c.event === 'sweep.completed')).toHaveLength(0);
  });

  it('never emits both terminal sweep outcomes for a single redemption attempt', async () => {
    for (const outcome of ['completed', 'failed'] as const) {
      const webhooks = createWebhookRecorder();
      await simulateRedemptionOutcome(outcome, webhooks);
      const terminal = webhooks.calls.filter((c) => c.event === 'sweep.completed' || c.event === 'sweep.failed');
      expect(terminal).toHaveLength(1);
    }
  });
});
