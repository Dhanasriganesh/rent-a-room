# Phase 5 — Rent management

## Model

| Record | Purpose |
|--------|---------|
| `rent_charges` | Obligation per allocation + period (`YYYY-MM`) |
| `payments` | Actual receipts (full or partial); no card PANs |

Balance = `amountDue − paidAmount`. Status: upcoming / due / partial / paid / overdue / disputed (review) / waived / cancelled.

## Monthly generation (idempotent)

`generateMonthlyRentCharges({ year, month, dueDay })`:

1. Loads allocations with status `reserved` or `active`.
2. Skips if a charge already exists for `allocationId + period`.
3. Uses allocation rent (or approved/issued contract rent when present).
4. Mid-month start/end **without** a proration rule → charge flagged `needsProrationReview` (status `disputed`) — manager must correct; no invented proration.
5. Safe to rerun: duplicates are not created.

## Payments

Staff record bank transfer / cash / other with reference notes only. Partial payments recalculate balance and set `partial` until fully paid.

## UI

`/manager/rent` — generate period, filter ledger, record payment, correct/waive, refresh statuses.

## Deploy

```bash
firebase deploy --only firestore:rules,firestore:indexes --project rentalrooms-50a77
```
