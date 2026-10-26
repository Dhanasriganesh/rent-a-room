# Staff guide (admin desk)

You operate everything from **`/manager`**. There is one staff desk (admin).

## Daily flow

1. **Applicants** — review pipeline; request info or approve.  
2. **Allocation** — reserve a bed only when application is approved.  
3. **Contracts** — draft → approve → issue (never treat drafts as signed legal instruments).  
4. **Rent** — generate period charges; record bank payments manually.  
5. **Messages / WhatsApp** — human replies; do not invent availability.  
6. **Maintenance** — triage tickets; urgent = call/escalate a person.  
7. **Move-in/out** — complete every checklist item before finishing.  
8. **Reports** — occupancy, rent, tickets snapshot when needed.

## What you must never do

- Put WhatsApp or email API tokens in the browser env.  
- Switch WhatsApp to **live** without checklist + written approval.  
- Confirm availability in chat before checking inventory.  
- End an allocation without move-out checklist (notice / keys / reopen).  
- Share contract bodies publicly.

## Inviting staff

Settings path historically under Users → Invite staff. Invitee opens `/invite/:token` with the **same email**.

## Renters & owners

| Role | Entry |
|------|--------|
| Renter | Public site → Apply / My Home |
| Owner (property login) | `/dashboard` — separate from CRM **Owners** records |
| Admin | `/manager` |

## Incidents

1. Turn on **Maintenance mode** (Settings).  
2. Disable public apply/chat if abuse.  
3. Check Audit log.  
4. Follow [DEPLOY_ROLLBACK.md](./DEPLOY_ROLLBACK.md) if a bad release.

## Support contacts

Fill in for your organisation: on-call phone, Meta Business admin, GCP project owner.
