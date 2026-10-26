# Phase 2 — Owners, Properties, Rooms & Beds

## Authoritative models

| Workflow | Authoritative now | Notes |
|----------|-------------------|--------|
| Listings, tenancies, rent charges | **`units`** (legacy) | Unchanged; keep working |
| Manager inventory, bed availability | **`rooms` + `beds`** | New; additive |
| Staff owner CRM | **`owners`** | May link to Firebase user via `linkedUserId` |
| Properties | **`properties`** | Supports `ownerId` (user) and/or `ownerRecordId` (CRM) |

## Schema

### `owners`
Staff CRM record: name, email, phone, notes, status, optional `linkedUserId`.

### `rooms`
Physical room under a property. Optional `legacyUnitId` when migrated from a unit.

### `beds`
Rentable space under a room. Statuses: available, reserved, occupied, blocked, maintenance, inactive.

### `rental_offers`
Versioned pricing for a bed/room/unit: monthly rent, deposit + `depositMeaning`, availability dates.

## Unit → room/bed mapping (idempotent)

| Legacy `units` | Migration result |
|----------------|------------------|
| Already has room with same `legacyUnitId` | **Skip** (safe to re-run) |
| `occupancyLimit` or `bedrooms` = N | 1 room + N beds |
| `unitType` room + N>1 | `roomType: shared` |
| apartment / house / loft / penthouse | Migrated + **MANUAL_REVIEW** note |
| Rent/deposit on unit | Active `rental_offers` on Bed 1 |

Units are **never deleted**. They gain `inventoryMigrated`, `linkedRoomId`.

## Rollback

1. Stop using manager inventory UI.
2. Delete `rooms` / `beds` / `rental_offers` / `owners` docs if needed (backup first).
3. Clear `inventoryMigrated` on units optionally.
4. Redeploy previous rules if required.

Do not run migration against production without backup and approval.
