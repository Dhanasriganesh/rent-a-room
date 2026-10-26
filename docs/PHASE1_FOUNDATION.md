# Phase 1 — Foundation & Access Control

## Goals

- Mediation/staff-centric RBAC without rebuilding the app.
- Secure bootstrap of the first admin; invitation-based staff thereafter.
- Preserve `units` and all existing owner/renter workflows.
- No WhatsApp, real email sends, or contract issuance in this phase.

## Roles

| Role | Home route | How created |
|------|------------|-------------|
| `admin` | `/admin` | Bootstrap (once) or admin promote / invite |
| `property_manager` | `/manager` | Admin invite only |
| `owner` | `/dashboard` | Public register |
| `renter` | `/my-home` | Public register |

Users cannot assign themselves `admin` or `property_manager` via the client.

## Bootstrap (first admin)

1. In Firebase Console → Firestore, create document:
   - Path: `platform_settings/bootstrap`
   - Field: `bootstrapAdminEmail` (string) = your email (lowercase recommended)
2. Register that email in the app as **Owner** or **Renter** (public form).
3. On successful registration, if no admin exists and the email matches bootstrap, the account is elevated to `admin` and `platform_settings/lock` is written.
4. Remove or leave the bootstrap doc; `lock` prevents repeat elevation.

**Do not** commit passwords or service-account keys. Prefer Console for the first admin if bootstrap is unavailable.

## Staff invitations

1. Sign in as admin → Admin → Users → **Invite staff**.
2. Enter email + role (`property_manager` or `admin`).
3. Share the one-time link `/invite/:token` (shown after create; also stored hashed metadata in Firestore).
4. Invitee opens link, registers/logs in with the **same email**, claims the invite.
5. Invitation is marked used; role applied; audit log written.

Invites expire after 7 days (configurable in code).

## Units → rooms/beds (Phase 2 plan — not executed in Phase 1)

| Existing `units` shape | Planned mapping |
|------------------------|-----------------|
| `unitType` in `room` / shared + `occupancyLimit` > 1 | One `rooms` row + N `beds` |
| Private room / studio / single occupancy | One `rooms` row + one `beds` row |
| Entire apartment / house as unit | One `rooms` (or property-level) + beds TBD — **manual review** |
| Linked `currentTenancyId` | Preserve; allocations will reference bed IDs later |

**Authoritative today:** `units` for listings, tenancies, rent.  
**Authoritative later:** `rooms` + `beds` for allocation; `units` remain for compatibility until cutover is approved.

## Rollback

1. Redeploy previous `firestore.rules`.
2. Revert app commit(s) for Phase 1.
3. Optionally delete `staff_invitations`, `staff_profiles`, `platform_settings/*`.
4. Manually set any elevated `users.role` back if needed.

No `units` documents are renamed or deleted by Phase 1.

## Security notes

- Firestore rules enforce role immutability for self-updates.
- Staff dashboards are route-guarded; rules grant staff read/write on operational collections.
- Document access for arbitrary owners was tightened: owners only see docs tied to their tenancies/ownership where rules allow; staff/admin retain operational access.
