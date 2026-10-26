# Phase 4 — Contracts & documents

## Approach (no DOCX library yet)

| Option | Pros | Cons |
|--------|------|------|
| **HTML/text templates in Firestore (chosen)** | No new dependency; preview in-app; private by rules; easy placeholder validation | Not a Word/PDF file; print via browser |
| Server DOCX (docxtemplater / LibreOffice) | Familiar Word output | Needs Cloud Functions + storage; more ops |
| Client PDF (jsPDF) | Downloadable PDF | Easy to treat as “signed”; weak for legal workflow |

Phase 4 stores **draft/approved body text privately** on the `contracts` document. No public static URLs.

## Placeholders

Required when present in the template: `owner_legal_name`, `tenant_full_name`, `property_address`, `room_label`, `bed_label`, `contract_start_date`, `monthly_rent`, `security_deposit`, `contract_reference`.

Optional: `contract_end_date`, `currency`.

**Missing required values block generation** with a clear error — no partial misleading contract.

## Workflow

1. Create/version a **template** (`/manager/contracts` → Templates).
2. After bed **allocation**, **Generate draft** from template + allocation.
3. **Preview / validate** → **Create draft**.
4. **Approve** → optional **Issue to tenant**.
5. Tenant sees approved/issued contracts under **My Home → Documents**.
6. Tenant may **Request renewal**; manager generates a **new** draft (prior contract kept, marked superseded on approve).

Statuses: `draft` → `approved` → `issued` → (`signed` later) | `superseded` | `void`.

## Deploy

```bash
firebase deploy --only firestore:rules,firestore:indexes --project rentalrooms-50a77
```
