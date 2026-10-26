# Phase 3 — Applications & Allocations

## Flow

1. Application created (renter via listing **or** admin via **Record application**).
2. Admin reviews in **Applicants**, updates status (notes audited).
3. Status **Approved** does **not** reserve a bed.
4. Admin opens **Room allocation**, picks approved applicant + available bed + dates/rent.
5. `allocateBedAtomically` runs a Firestore **transaction** on the bed document.

## Double-booking rule

The **bed** document is the lock:

- Allocation only succeeds if `bed.status == available` and `currentAllocationId` is empty.
- On success: bed → `reserved` + `currentAllocationId`, application → `allocated`.
- Concurrent writes to the same bed collide; one transaction wins, the other fails with a clear error.

Cancelling an allocation frees the bed; the allocation row stays as history (`cancelled`).

## Statuses (applications)

`new` → `under_review` → `more_information_requested` / `viewing_scheduled` → `approved` → `allocated`  
Also: `rejected`, `withdrawn`, `closed`.

Legacy aliases still accepted: `in_review`, `accepted`, etc.

## Collections

| Collection | Role |
|------------|------|
| `applications` | Pipeline + enquiry data |
| `allocations` | Historical + current bed assignments |
| `beds` | Inventory + `currentAllocationId` lock |

## How to test

1. Deploy rules: `firebase deploy --only firestore:rules`
2. Ensure a property has at least one **available** bed (Phase 2 inventory).
3. `/manager/applicants` → Record application → set status **Approved**.
4. **Allocate bed** → confirm.
5. Try allocating the **same bed** again (second approved applicant) → must fail.
6. Cancel first allocation → bed available → second allocate succeeds.
