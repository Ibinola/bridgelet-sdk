# Account Status State Transitions (ibinola-1019)

Standalone documentation helper for issue #1019: a single-place state-transition diagram for `AccountStatus` lifecycle values, including `INITIALIZING`, `CLAIMING`, and `PARTIAL_SWEEP`.

## States
- `INITIALIZING`
- `PENDING_PAYMENT`
- `PENDING_CLAIM`
- `CLAIMING`
- `PARTIAL_SWEEP`
- `CLAIMED` (terminal)
- `EXPIRED` (terminal)
- `FAILED` (terminal)

## Transition Diagram

```text
                    INITIALIZING
                      /       \
          (funding ok)         (creation/stuck init failure)
                    /             \
                   v               v
           PENDING_PAYMENT      FAILED
             /   |    \
  (payment) /    |     \ (TooManyPayments/InvalidAmount)
           v     |      v
    PENDING_CLAIM|    FAILED
        \        |
  (expiry/unclaimed sweep)
          \      v
           \  EXPIRED

    PENDING_CLAIM <---------------------------+
          |                                   |
          | (redeem acquires lock)            | (rollback, retryable)
          v                                   |
       CLAIMING ------------------------------+
        /  |  \
       /   |   \ (contract auth ok, horizon payment failed)
      /    |    v
     /     |  PARTIAL_SWEEP --(retry, skipContractAuth)--> CLAIMING
    /      |
   v       v
CLAIMED  (sweep error rollback) -> PENDING_CLAIM or PARTIAL_SWEEP

Terminal: CLAIMED, EXPIRED, FAILED (no outgoing transitions)
```

## Notes
- `AccountStatus` values were introduced over multiple migrations (`INITIALIZING`, `CLAIMING`, `PARTIAL_SWEEP` added later); this diagram consolidates the lifecycle in one place.
- Code-level enforcement should be treated as authoritative (`ACCOUNT_STATUS_TRANSITIONS` in `src/modules/accounts/enums/account-status-transition.util.ts`), with conditional updates/row locks providing concurrency guarantees.
- This standalone document is intended to complement `docs/database-schema.md` for integrators and reviewers.
