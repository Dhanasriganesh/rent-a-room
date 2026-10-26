# Phase 8 — Move-in/out, maintenance, reporting

## Scope

| Area | Location |
|------|----------|
| Maintenance tickets | `requests` (+ `createMaintenanceTicket`) · `/manager/maintenance` |
| Move-in / move-out | `move_events` · `/manager/lifecycle` |
| Operational report | `buildOperationalReport` · `/manager/reports` |

## Maintenance

- Tickets link to property / allocation when known.
- Status history on every status change.
- `urgent` sets `escalated` and enqueues a **sandbox** desk email — no automated emergency dispatch.
- Categories / urgency / statuses live in `src/lib/constants.js`.

## Move events

- Types: `move_in` | `move_out`.
- Checklist keys from `MOVE_IN_CHECKLIST_ITEMS` / `MOVE_OUT_CHECKLIST_ITEMS`.
- **Complete** requires every item checked (staff confirmation — not automated legal judgment).
- Move-in complete → allocation `active`, bed `occupied`.
- Move-out complete → allocation `ended`; bed `maintenance` or `available` per checklist.
- `legalFlags` are staff notes only; the system never concludes notice/deposit legality.

## Reports

Staff-only snapshot:

- Inventory / occupancy by property  
- Applications by status  
- Lifecycle (move-ins, contracts ending in range)  
- Rent charged / collected / outstanding / overdue  
- Maintenance open / urgent / avg resolution hours  
- Notification delivery logs (sandbox vs failed)

Timezone label: `Europe/Berlin`.

## Rules

```
match /move_events/{id}  → staff write; staff or own tenant read
match /requests/{id}     → existing staff/creator rules (unchanged)
```

## Acceptance

1. Create a maintenance ticket and change status with history.  
2. Create move-in and move-out events; toggle checklist; complete only when all done.  
3. Generate operational report with occupancy + rent + ticket counts.  
4. No automated legal conclusion on notice/deposit.

## Deploy rules

```bash
firebase deploy --only firestore:rules --project rentalrooms-50a77
```
