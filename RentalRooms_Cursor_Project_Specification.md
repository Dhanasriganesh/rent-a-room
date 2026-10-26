# RentalRooms --- Complete Product Requirements & Cursor Implementation Specification

**Project:** RentalRooms / rental-room mediation and property-management
platform\
**Reference application:** https://rentalrooms.vercel.app/\
**Document purpose:** Give Cursor a complete, structured specification
for reviewing and extending the existing application.\
**Implementation principle:** Inspect the current codebase first.
Preserve working functionality. Do not rewrite the application or make
destructive changes without a clear reason.

------------------------------------------------------------------------

## 1. Instructions to Cursor

Act as a senior full-stack engineer, product architect, database
designer, security-minded reviewer, and UI/UX engineer.

Your task is to inspect the existing RentalRooms repository and
implement the requirements in this document incrementally.

### Mandatory working rules

1.  **Inspect before changing.** Review the repository structure,
    package files, routes, components, authentication, current data
    model, database integrations, environment-variable usage, deployment
    configuration, and existing UI.
2.  **Do not assume the stack.** Identify the existing framework and
    libraries from the repository. Reuse them where reasonable. Do not
    replace React/Next.js, a database, authentication, styling, or
    deployment setup just because another option is preferred.
3.  **Create an implementation plan first.** Summarise the current
    architecture, existing features, missing features, proposed data
    model, risks, and phased implementation plan before major edits.
4.  **Preserve existing functionality and visual identity** unless a
    change is necessary or requested. Extend the current app rather than
    rebuilding it unnecessarily.
5.  **Work in small, testable phases.** After each phase, run available
    linting, type checks, tests, and build commands. Fix errors
    introduced by the changes.
6.  **Never invent integrations or credentials.** Do not hard-code
    tokens, passwords, API keys, private URLs, or real tenant
    information. Use environment variables and documented setup steps.
7.  **Do not connect or migrate the client's live WhatsApp number during
    initial development.** Build and test with mocks or Meta's test
    number. Production onboarding must be a separate, explicitly
    approved step.
8.  **Do not send real messages, emails, rent reminders, or contracts in
    development.** Provide a sandbox/dry-run mode.
9.  **No destructive database changes without approval.** Use
    migrations, preserve existing data, and document backup/rollback
    steps.
10. **Do not fabricate legal validity.** Generated contracts are drafts
    until reviewed and approved by an authorised manager. Do not create,
    paste, or reuse a signature without appropriate authority and
    consent.
11. If a requirement is ambiguous, implement a safe, configurable
    default and record the assumption. Ask for clarification only when
    proceeding would create a material security, financial, legal, or
    data-loss risk.
12. Keep the application responsive, accessible, maintainable, and
    suitable for future production use.

### Initial response expected from Cursor

Before writing substantial code, return: - Current stack and
architecture discovered in the repository. - Existing features and
routes. - Existing data model and integrations. - Gaps against this
specification. - A phased implementation plan. - Any blockers or
decisions requiring the developer's input.

After that, proceed with the first safe, high-value phase unless the
repository reveals a blocker.

------------------------------------------------------------------------

## 2. Product vision

RentalRooms is a central platform for a company that mediates between
property owners and people looking to rent rooms. The company handles
the rental journey from property intake and room enquiries through
applicant review, room allocation, contracts, move-in, ongoing tenant
communication, rent tracking, renewals, maintenance, and move-out.

The platform should reduce manual coordination across WhatsApp chats,
email, documents, and spreadsheets. It must maintain one reliable source
of truth for properties, rooms/beds, applicants, tenants, contracts, and
payments.

**Core principle:** The database and workflow engine are authoritative.
WhatsApp, email, and website chat are communication channels---not
separate sources of truth.

### Primary outcomes

-   Owners and property managers can record property and room details
    consistently.
-   Applicants can find available rooms and submit
    enquiries/applications.
-   Managers can process applicants and allocate a specific room or bed
    without double-booking.
-   Owner-specific contract templates can generate tenant-specific
    contract drafts.
-   Managers can record rent and monitor due, paid, partially paid, and
    overdue amounts.
-   Reminders and notifications can be scheduled, delivered, retried
    safely, and audited.
-   Tenants can communicate through website messaging and, after
    approved setup, WhatsApp.
-   Contract renewals, move-ins, maintenance, and move-outs have
    traceable workflows.
-   Personal documents and financial data are accessible only to
    authorised people.

------------------------------------------------------------------------

## 3. Roles, accounts, and permissions

Implement role-based access control (RBAC). Use the existing
authentication solution if it is suitable.

### Roles

**Platform administrator** - Manage application-wide configuration and
authorised staff access. - View operational health and integration
status. - Does not automatically gain unrestricted access to every
private document unless required and authorised.

**Property manager / staff** - Manage assigned owners, properties,
rooms, applications, tenants, allocations, contracts, rent, messages,
and maintenance. - Generate contract drafts and issue them after
approval. - Record payments and authorised exceptions. - View audit
history for actions within their permissions.

**Property owner** - View and manage only their own profile and
authorised properties. - Add/edit property information if the product
supports owner self-service. - Upload approved contract templates and
property documents. - View occupancy, allocations, and owner-relevant
updates. - Must not see unrelated owners' properties or other tenants'
private documents.

**Applicant** - Browse public property/room information. - Submit an
application and view only their own application status when
authenticated or securely linked. - Communicate with the company. -
Cannot view other applicants.

**Tenant** - View their own tenancy, allocated property/room, their own
contract documents, rent statements, notices, and messages. - Submit
maintenance requests and renewal requests. - Cannot access other
tenants' records or shared private financial information.

### Security rules

-   Enforce permissions on the server/API, not only by hiding UI
    elements.
-   Apply tenant/owner scoping to every query.
-   Deny by default.
-   Validate user input on the server.
-   Protect document download links; use private storage and short-lived
    signed URLs where supported.
-   Record important actions in an audit log.
-   Never expose secrets in client-side bundles or logs.

------------------------------------------------------------------------

## 4. Core application navigation

Adapt the existing layout and design; do not introduce duplicate
navigation if similar sections already exist.

Recommended manager sidebar: 1. Overview 2. Properties 3. Rooms & Beds
4. Owners 5. Applicants 6. Tenants 7. Room Allocation 8. Contracts &
Documents 9. Rent Management 10. Messages / Inbox 11. Maintenance 12.
Move-in / Move-out 13. Notifications 14. Reports 15. Settings

Use responsive navigation for desktop and mobile. Include loading,
empty, error, success, and permission-denied states. Use consistent page
titles, filters, search, pagination, forms, confirmation dialogs, and
status badges.

### Overview dashboard

Show useful summary cards and lists: - Total properties. - Total
physical rooms and bed capacity. - Available beds/rooms. - Occupied
beds/rooms. - New applications requiring review. - Upcoming viewings and
move-ins. - Contracts ending soon. - Rent due this month and overdue
balances. - Recent messages and unresolved maintenance tickets. - Failed
notifications requiring attention.

All numbers must be calculated from real persisted records; do not use
hard-coded demo totals outside clearly labelled seed/demo data.

------------------------------------------------------------------------

## 5. Property, owner, room, and bed inventory

### Owner record

Suggested fields: - id - full_name / legal_name - contact_email -
phone_number - address (only if needed) - preferred_contact_channel -
notes (restricted to authorised staff) - status - created_at /
updated_at

### Property record

Suggested fields: - id - owner_id - property_name or internal
reference - street, postal_code, city, country - description -
photos/media references - property type - house rules / relevant notes -
status: draft, pending review, active, inactive, archived - created_by /
timestamps

Avoid making sensitive owner information public. Public listing data
should be explicitly selected rather than serialising the entire owner
record.

### Physical rooms and beds

Model physical rooms separately from room types and beds.

**Room** - id - property_id - room label/number - room description -
room type (private/shared/other configurable type) - capacity - status -
photos (optional) - created_at / updated_at

**Bed / rentable space** - id - room_id - label (e.g. Bed 1, Bed A) -
status: available, reserved, occupied, blocked, maintenance, inactive -
optional features/notes - created_at / updated_at

A private room may have one rentable space. A shared room may have two,
three, four, or a configurable number of beds. Do not treat a room-type
count as a substitute for physical inventory.

### Pricing and terms

Keep rental pricing as explicit, versioned terms rather than scattered
text: - room/bed or offer reference - monthly rent amount and currency
(EUR by default for the current Germany use case) - deposit/advance
amount and clearly defined meaning - additional recurring charges, if
applicable - available_from date - minimum/maximum stay if used -
contract terms/template reference - effective dates and status

Clarify whether "advance" means security deposit, advance rent, or
another fee. Do not silently merge these concepts. Show the meaning in
the UI.

### Availability rules

-   Availability must be derived from bed/space status and
    active/reserved allocations.
-   Prevent overlapping active allocations for the same bed.
-   Use a database transaction or equivalent atomic server-side
    operation to allocate a bed.
-   Check availability again at confirmation time, not just when the
    page first loads.
-   A failed allocation must return a useful message and leave no
    partial records.
-   Do not publish a room as available while it is blocked, under
    maintenance, or allocated for the relevant dates.

### Property manager actions

-   Create, view, edit, deactivate/archive properties.
-   Add rooms and beds/spaces.
-   Define rent, deposit, and availability.
-   Upload owner documents and contract template.
-   Preview public listing.
-   See applicants and current/past allocations for each property.
-   View room occupancy and bed availability.

------------------------------------------------------------------------

## 6. Public listings and tenant application flow

### Public listing pages

-   List active, approved properties and available room/bed options
    only.
-   Provide filters such as city/area, rent range, room type, move-in
    date, and capacity where supported by the existing product.
-   Show accurate photos, rent, deposit, availability, room
    configuration, and relevant house rules.
-   Avoid exposing owner personal contact details or private documents.
-   Clearly distinguish monthly rent from one-time deposit/advance.

### Application form

Collect only information necessary for rental mediation. Potential
fields: - Full name - Email address - Phone number - Preferred property
and room/bed/room type - Desired move-in date - Expected stay duration -
Number of occupants, if relevant - Applicant message - Supporting
documents only if needed and with appropriate notice

Do not request sensitive information by default. Any identity,
immigration, financial, or other sensitive documents require a clear
purpose, restricted access, and a retention policy.

### Application record

Suggested fields: - id - applicant/user id if account exists -
property_id - room_id or requested room type - requested move-in date -
intended duration - application data - status - assigned manager -
submitted_at / updated_at - internal notes (staff-only) - consent/notice
version where appropriate

Statuses: - new - under_review - more_information_requested -
viewing_scheduled - approved - rejected - withdrawn - allocated - closed

### Manager workflow

-   Application appears in the manager dashboard immediately after
    successful submission.
-   Manager can filter/search by property, room type, status, date, and
    assigned manager.
-   Manager can add internal notes and change status with an audit
    entry.
-   Manager can request additional information.
-   Approval must not automatically allocate a bed unless the manager
    explicitly confirms an allocation.
-   Rejection and closure should use respectful, configurable
    communication.
-   Prevent duplicate form submissions where practical; use idempotency
    or deduplication safeguards.

------------------------------------------------------------------------

## 7. Room/bed allocation

Build a dedicated Room Allocation area.

### Allocation workflow

1.  Manager opens an approved applicant.
2.  Selects the property, physical room, and specific bed/rentable
    space.
3.  Sets intended start/end dates and confirms agreed rent/deposit
    terms.
4.  System rechecks availability and validates all required fields.
5.  Allocation is saved atomically.
6.  Bed status and availability are updated.
7.  Tenant/property/application links are created consistently.
8.  Contract draft generation is offered or triggered according to
    configured workflow.
9.  Tenant and manager are notified only after successful persistence.

### Allocation record

Suggested fields: - id - tenant_id / applicant_id - property_id -
room_id - bed_id - start_date - planned_end_date (nullable where
allowed) - actual_end_date - agreed_monthly_rent - agreed_deposit -
currency - status: pending, reserved, active, ended, cancelled -
created_by / approved_by - timestamps

### Rules

-   A person cannot be allocated to a bed for dates that conflict with
    another active/reserved allocation.
-   A bed cannot be double-booked for overlapping periods.
-   If a manager changes a tenant's room, retain the history of the
    prior allocation.
-   Ending a tenancy must not immediately make a bed public if
    inspection/cleaning or a manager approval is still required.
-   Keep allocation and contract terms historically accurate.

------------------------------------------------------------------------

## 8. Contracts and document management

This feature has legal and privacy implications. Implement document
generation as controlled draft creation, not automatic legal approval.

### Owner-specific templates

When creating a property, an authorised manager should be able to
upload: - Owner-provided contract template - Relevant owner/property
documents - Supporting terms or attachments

Associate each template with an owner and optionally a property. Support
multiple template versions. Store the original unchanged.

### Template processing

First inspect the existing repository to see whether a document
generation library already exists. If not, propose an appropriate
server-side template approach for DOCX/PDF and explain trade-offs before
adding dependencies.

Use explicit named placeholders, for example: - `{{owner_legal_name}}` -
`{{tenant_full_name}}` - `{{property_address}}` - `{{room_label}}` -
`{{bed_label}}` - `{{contract_start_date}}` - `{{contract_end_date}}` -
`{{monthly_rent}}` - `{{security_deposit}}` - `{{contract_reference}}`

Maintain a template field mapping and validation report. If a required
placeholder cannot be filled, stop generation and show a clear error
rather than producing a misleading contract.

### Contract generation workflow

1.  Manager allocates a tenant/bed and chooses the applicable template.
2.  System populates the template using verified records and confirmed
    terms.
3.  Generate a draft with a unique contract reference and version.
4.  Show a preview and missing-field warnings.
5.  Manager reviews and approves the draft.
6.  Approved document is stored privately and made available to
    authorised users.
7.  Signing can be integrated later with a legally appropriate
    e-signature provider; do not claim a generated PDF is signed or
    legally valid without the required process.

### Signatures

-   Do not automatically paste a stored signature image into a contract
    without documented authority and an appropriate legal process.
-   Preserve original signed documents.
-   Record who approved or signed a version and when, where supported.
-   Keep draft, approved, issued, signed, superseded, and void statuses
    distinct.

### Contract record

Suggested fields: - id - tenant_id - property_id - allocation_id -
template_id / template_version - contract_reference - version -
start_date / end_date - rent and deposit terms snapshot - status -
generated_by / approved_by - file reference - created_at / updated_at -
supersedes_contract_id (nullable)

### Tenant documents

Each tenant's document area should show only documents they are
authorised to see: - Current contract - Previous contracts - Renewal
contracts - Relevant notices - Move-in/move-out records - Other approved
documents

Use private object storage or the existing secure file-storage approach.
Never expose private documents through public static URLs.

------------------------------------------------------------------------

## 9. Contract renewal and visa-extension requests

Provide a "Request contract renewal" action for a tenant, and a
"Generate renewal contract" action for an authorised manager.

### Workflow

1.  Tenant submits a renewal request and optional explanation.
2.  Manager reviews the request.
3.  Manager confirms the intended dates and any changed terms.
4.  System creates a new draft from the applicable template.
5.  Manager reviews and approves the draft.
6.  Document is issued to the tenant for review/signature as
    appropriate.
7.  Status and relevant dates are updated only after authorised
    confirmation.

### Rules

-   Never overwrite the original signed contract.
-   Create a new version/document for each renewal.
-   Preserve a complete history of terms and dates.
-   Record the reason for renewal where appropriate, without
    unnecessarily storing sensitive visa information.
-   Do not assume a visa-related request guarantees approval or a legal
    right to a specific contract.
-   Do not backdate or alter contract terms to misrepresent the actual
    agreement.
-   Validate that the new dates and terms are authorised and consistent
    with the tenancy.

------------------------------------------------------------------------

## 10. Rent management

Create a Rent Management sidebar section and dedicated rent dashboard.

### Rent ledger

Track rent obligations and actual payments separately.

**Rent charge / obligation** - id - tenant_id - allocation_id /
contract_id - period (e.g. 2026-11) - due_date - amount_due - currency -
status - adjustments/waivers with reason and authorised user -
created_at

**Payment** - id - tenant_id - rent_charge_id or allocation across
charges - amount - payment_date - method/reference (avoid storing full
bank-card details) - recorded_by - notes - created_at

Support partial payments, overpayments/credits where needed, and
corrections with audit history. Do not assume a message delivery or
tenant claim means a payment occurred.

### Dashboard

Show: - Tenant - Property, room, and bed - Billing period - Rent amount
due - Amount paid - Remaining balance - Due date - Status: upcoming,
due, partially paid, paid, overdue, disputed/under review - Last payment
date - Reminder history

Filters: - Property - Month/period - Tenant - Status - Due date -
Assigned manager

### Monthly rent generation

-   Generate rent obligations from active contract/allocation terms
    using a scheduled job.
-   Define a configurable monthly due date; do not assume every contract
    has identical terms.
-   Handle tenancy start/end mid-month according to a configured,
    reviewed proration rule. If no rule is configured, flag for manager
    review rather than inventing a charge.
-   Ensure idempotency: rerunning the job must not create duplicate rent
    charges for the same tenant/contract/period.
-   Account for time zone, daylight saving, and month-end behaviour.
-   Provide a manual review and correction flow.

### Recording payments

-   Authorised staff can record full or partial payments.
-   Recalculate the outstanding balance reliably.
-   Keep audit history for corrections.
-   Do not integrate bank/payment processing unless explicitly requested
    and securely designed.

------------------------------------------------------------------------

## 11. Notifications and reminders

Implement a notification service that can support email, WhatsApp,
in-app alerts, and future channels.

### Event types

-   Application received
-   Status changed / additional information requested
-   Viewing confirmed or changed
-   Allocation confirmed
-   Contract draft ready / contract issued
-   Renewal request received / renewal ready
-   Rent reminder
-   Payment recorded
-   Maintenance ticket update
-   Move-in / move-out reminder
-   Notification delivery failure

### Rent reminder schedule

Default requirement: initiate reminders from the first day of each
month, but use each rent charge's actual due date and the manager's
configured policy. Do not send reminders for charges that are fully
paid, cancelled, or under a relevant hold.

Suggested configurable schedule: - First reminder at the configured
start of the month or on the charge's due date. - Optional follow-up
after a configured number of days if still unpaid. - Optional overdue
escalation to staff. - Maximum reminders per charge and quiet hours. -
Per-tenant opt-out/preferences where legally and operationally
applicable.

### Channels

**Email** - Use an email provider configured through environment
variables. - Store delivery status and provider message ID. - Use
templates with safe escaping and no unnecessary sensitive details. - Do
not send email until the provider is configured and a sandbox test
passes.

**WhatsApp** - Use the official WhatsApp Business Platform Cloud API
after a separate production onboarding approval. - Build a provider
adapter so the rest of the app is not tightly coupled to Meta's API. -
Keep access tokens server-side and in secrets management. - Verify
webhook signatures where supported. - Track sent, delivered, read,
failed, and other available statuses. - Follow WhatsApp's
customer-service window and approved-template rules. - Use approved
utility templates where appropriate for reminders outside the permitted
free-form window. - Do not assume that the standard Cloud API can post
messages to existing WhatsApp groups. Treat group posting as unsupported
unless Meta explicitly enables it for the actual account and
integration. - Do not put one tenant's rent details into a shared room
group. Send private messages to each tenant instead. - Support staff
handover and prevent bot/agent duplicate replies.

**In-app** - Show unread counts, event timestamps, links to relevant
records, and read status where useful.

### Reliability

-   Use a job queue/scheduler suitable for the existing stack.
-   Retry transient failures with bounded backoff.
-   Avoid infinite retries.
-   Use idempotency keys and unique event/notification records to
    prevent duplicate sends.
-   Provide a failed-notifications queue with manual retry.
-   Support dry-run mode in development.
-   Log metadata and errors without logging full private message content
    or secrets unnecessarily.

------------------------------------------------------------------------

## 12. Website messenger and central inbox

Build a messenger-style interface that can be opened from a floating
button on relevant public pages.

### Website chat

-   Start an enquiry about a property or room.
-   Collect only necessary details.
-   Show clear options for room search, availability, viewing,
    application status, and contacting a manager.
-   Create or associate the conversation with a contact/application
    where appropriate.
-   Do not promise availability unless verified from the database.
-   Allow escalation to a human manager.

### Manager inbox

-   Conversations grouped by tenant/applicant/contact.
-   Channel label: website, WhatsApp, email, or other.
-   Associated property, room, application, and tenant if known.
-   Message timeline and delivery states.
-   Assignment to a manager.
-   Internal notes not visible to the customer.
-   Open, pending, escalated, resolved statuses.
-   Search/filter and unread indicators.
-   Clear bot/human handover state.

### AI assistant (optional phase)

If AI is added: - Restrict it to approved FAQs and verified application
data. - Never fabricate properties, prices, availability, contract
terms, payment status, or legal advice. - Escalate uncertain, sensitive,
legal, payment-dispute, safety, and complaint scenarios to staff. - Keep
tools/actions permissioned and validated server-side. - Record
AI-generated drafts and any staff approval where appropriate. - Do not
send consequential messages or change bookings/contracts based only on
an unconfirmed AI inference.

------------------------------------------------------------------------

## 13. Maintenance management

Allow tenants to submit maintenance requests linked to their
tenancy/property/room.

Suggested fields: - id - tenant_id - property_id - room_id / bed_id if
relevant - category - description - urgency - photo/file references, if
needed - status: new, triaged, assigned, in_progress, waiting, resolved,
closed - assigned staff/contractor - timestamps and status history

Notify the manager when a ticket is submitted. Provide a human
escalation path for urgent issues. Do not promise automated emergency
handling. Limit access to uploaded images/documents and avoid exposing
private information.

------------------------------------------------------------------------

## 14. Move-in and move-out

### Move-in checklist

-   Contract status checked.
-   Required signatures/approvals recorded.
-   Start date and allocation confirmed.
-   Payment/deposit status recorded if applicable.
-   Key handover and check-in appointment recorded.
-   Condition/inventory checklist completed if used.
-   Tenant receives approved instructions.

### Move-out workflow

-   Tenant or manager records intended move-out date.
-   Manager confirms notice and applicable terms.
-   Schedule inspection.
-   Record room condition and key return.
-   Track outstanding rent or authorised adjustments.
-   End allocation only after required approvals.
-   Mark bed unavailable for cleaning/maintenance if needed.
-   Reopen availability only after manager confirmation.
-   Retain contract and relevant audit history according to the
    configured retention policy.

Do not automate legal conclusions about notice periods or deposit
deductions. Flag these for authorised staff review.

------------------------------------------------------------------------

## 15. Reports

Provide role-restricted reports for: - Occupancy by property, room, and
bed. - Available inventory. - Applications by status and source. -
Upcoming move-ins/move-outs. - Contracts ending soon. - Rent charged,
collected, outstanding, and overdue by period. - Reminder delivery and
failure rates. - Maintenance tickets and resolution times.

Use actual persisted data. Include date ranges, timezone clarity, and
export permissions. Exports must not leak information beyond the user's
role.

------------------------------------------------------------------------

## 16. Suggested data model

Adapt names and relationships to the existing database; this is a
conceptual model, not an instruction to recreate the database blindly.

Core entities: - User - Role / permission - Owner - Property -
PropertyMedia - Room - Bed / RentableSpace - RentalOffer /
PricingTerms - Applicant - Application - Tenant - Allocation / Tenancy -
ContractTemplate - ContractTemplateVersion - Contract -
ContractDocument - RentCharge - Payment - Conversation - Message -
Notification - NotificationAttempt - MaintenanceTicket - MoveInChecklist
/ MoveOutChecklist - AuditLog - IntegrationAccount / IntegrationEvent

### Relationship principles

-   An owner can have multiple properties.
-   A property can have multiple physical rooms.
-   A room can have multiple rentable spaces/beds.
-   An application references the property and the requested room/room
    type.
-   A tenant can have historical and current allocations.
-   An allocation links a tenant to one specific rentable space for a
    date range.
-   Contracts reference the relevant tenant, property, allocation,
    template version, and a snapshot of agreed terms.
-   Rent charges are derived from the relevant contract/allocation terms
    and period.
-   Payments are separate records and can settle one or more charges
    where needed.
-   Conversations can link to a contact and optionally to an
    application, tenant, owner, property, or allocation.
-   Notifications and attempts have status and idempotency metadata.
-   Audit logs capture important changes without storing secrets.

Use appropriate foreign keys, indexes, uniqueness constraints, and
transactions. Money should use fixed-precision decimal/numeric storage
or integer minor units---not floating-point arithmetic. Store timestamps
consistently and handle display timezone explicitly.

------------------------------------------------------------------------

## 17. API and backend design

Follow the existing repository's conventions. If APIs exist, extend them
rather than creating a second competing pattern.

Requirements: - Validate all request payloads server-side. - Use
consistent error responses. - Enforce role and record-level
permissions. - Add pagination and filtering for lists. - Avoid
over-fetching private data. - Use transactions for allocation, contract
issuance state changes, and rent generation where appropriate. - Use
idempotency for scheduled jobs and webhook processing. - Add rate
limiting and abuse protection to public forms and chat. - Avoid leaking
stack traces or sensitive records to clients. - Keep business logic out
of UI components. - Add tests for high-risk business rules.

Possible service boundaries: - PropertyService -
Inventory/AvailabilityService - ApplicationService - AllocationService -
ContractService - RentLedgerService - NotificationService -
ConversationService - WhatsAppProvider - EmailProvider - AuditService

These can be modules within a single application; do not introduce
microservices unless the existing architecture justifies them.

------------------------------------------------------------------------

## 18. WhatsApp Cloud API integration plan

This is a later integration phase after core workflows and a test
environment are working.

### Development

-   Use Meta's test number and test recipients where available.
-   Store credentials in server-side environment variables/secrets.
-   Provide mock provider mode.
-   Build webhook verification and inbound event processing.
-   Verify webhook signatures and deduplicate events where supported.
-   Separate inbound messages, outbound messages, delivery statuses, and
    conversation state.
-   Add a clear setup guide for Meta app, WhatsApp product, phone number
    ID, business account ID, access token, webhook URL, and verification
    token. Never commit actual secrets.

### Existing client number

The client wants to keep using their existing WhatsApp Business App
number. Before connecting it: - Confirm the current account and number
ownership. - Back up important chats using the client's normal supported
process. - Confirm eligibility for Meta's supported WhatsApp Business
App coexistence onboarding. - Do not use a standard registration flow
that might deregister the number from the app. - If coexistence is not
available for the account/region/provider, explain alternatives and
obtain explicit client approval. - Test staff replies, inbound messages,
outbound templates, delivery status, and duplicate prevention. - Have a
rollback/contingency plan before production activation.

### Production

-   Client should own the business portfolio, WhatsApp Business Account,
    phone number, and payment method.
-   Developer receives only the minimum required permissions.
-   Use production message templates approved for the appropriate
    category.
-   Respect WhatsApp policies, opt-in requirements, customer-service
    windows, and applicable pricing.
-   Implement budget monitoring and message volume limits where
    available.
-   Never assume messages to WhatsApp groups are supported. Private
    messages are the default for tenant-specific notifications.

------------------------------------------------------------------------

## 19. Email integration plan

-   Use a transactional email provider chosen by the project owner.
-   Configure sender domain and authentication records outside the
    codebase.
-   Store API credentials as secrets.
-   Create reusable templates for applications, viewings, contract
    availability, rent reminders, maintenance updates, and renewals.
-   Add sandbox/dry-run mode and test recipient allowlist.
-   Track provider IDs, delivery status, failure reason, and retries.
-   Avoid placing full sensitive contract or identity documents directly
    in email; use authorised secure links when appropriate.

------------------------------------------------------------------------

## 20. UI/UX quality requirements

-   Maintain a consistent visual system using the existing app's design
    tokens/components.
-   Use clear typography, spacing, headings, labels, and status
    indicators.
-   Use accessible contrast and keyboard navigation.
-   Ensure forms have labels, validation, and understandable errors.
-   Confirm destructive actions and important status changes.
-   Make tables usable on small screens.
-   Include loading skeletons/spinners, empty states, error states, and
    success feedback.
-   Use date and currency formatting appropriate for the configured
    locale; EUR is the initial default.
-   Avoid displaying fake numbers as real business data.
-   Provide a coherent responsive experience for desktop, tablet, and
    mobile.
-   Do not replace the existing UI wholesale without first reviewing it.

------------------------------------------------------------------------

## 21. Privacy, security, and compliance requirements

The platform is expected to handle personal information, contracts,
rental details, and payment records. Implement privacy and security as
core requirements.

-   Apply data minimisation and purpose limitation.
-   Define retention and deletion rules for applications, chats,
    uploaded documents, contracts, and logs.
-   Restrict access by role and record ownership.
-   Use HTTPS in production.
-   Secure cookies/sessions and protect against CSRF/XSS/SQL injection
    according to the stack.
-   Validate and scan uploaded files as appropriate; restrict size and
    accepted types.
-   Store private files in non-public storage.
-   Use expiring links for private documents.
-   Keep secrets out of source control, logs, and client-side code.
-   Maintain audit logs for contract, allocation, rent, and permission
    changes.
-   Provide data export/deletion processes where applicable.
-   Avoid collecting visa/immigration data unless there is a defined,
    lawful need.
-   Obtain appropriate legal review for tenancy templates and data
    processing in Germany/EU.
-   Do not claim GDPR or tenancy-law compliance solely because these
    technical controls exist; compliance requires appropriate
    organisational/legal measures as well.

------------------------------------------------------------------------

## 22. Testing requirements

Add or update tests based on the existing test framework.

### Critical business-rule tests

1.  A public listing does not expose private owner/tenant data.
2.  An applicant can view only their own application.
3.  A tenant can view only their own contracts and rent details.
4.  An owner can access only their authorised properties.
5.  Two simultaneous requests cannot allocate the same bed for
    overlapping dates.
6.  A room with capacity three can have three separate valid bed
    allocations but not a fourth.
7.  Changing an allocation preserves history.
8.  Generating monthly rent charges twice does not duplicate charges.
9.  Fully paid rent does not receive a standard unpaid reminder.
10. Partial payments calculate the remaining balance correctly.
11. Contract generation fails clearly when required template fields are
    missing.
12. A renewal creates a new version and preserves the original signed
    contract.
13. Notification retries do not create duplicate messages.
14. WhatsApp webhook retries do not process the same event twice.
15. Development mode does not send real messages or emails.
16. Unauthorised users cannot download private files.
17. Invalid or expired sessions cannot access protected APIs.

### Verification commands

Discover the actual scripts from the repository's package manager and
run relevant commands, such as: - lint - typecheck - unit tests -
integration tests - production build

Do not claim tests passed unless they were actually run. Document tests
that could not be run and why.

------------------------------------------------------------------------

## 23. Phased implementation plan

### Phase 0 --- Repository audit and plan

-   Inspect existing application.
-   Map current pages, components, routes, database, auth, and
    deployment.
-   Identify current functionality and gaps.
-   Provide a no-destructive-change plan.
-   Do not implement live integrations yet.

**Deliverable:** Architecture summary, gap list, proposed data model
changes, and phased plan.

### Phase 1 --- Foundation and access control

-   Improve or complete auth and role checks using existing
    infrastructure.
-   Add server-side validation and audit logging foundations.
-   Create migrations for only the necessary entities.
-   Ensure private/public data separation.

**Acceptance:** Existing features still work; access-control tests pass.

### Phase 2 --- Owners, properties, rooms, beds, pricing

-   Owner/property CRUD.
-   Room and bed inventory.
-   Pricing and availability.
-   Public listing integration.

**Acceptance:** Managers can add a property with multiple rooms and bed
capacities; public availability reflects saved records.

### Phase 3 --- Applications and allocations

-   Application forms.
-   Manager applicant pipeline.
-   Filtering and status changes.
-   Transaction-safe bed allocation.

**Acceptance:** Submitted application appears under the correct
property/room request; one bed cannot be double-booked.

### Phase 4 --- Contracts and documents

-   Secure template upload and versioning.
-   Placeholder mapping.
-   Draft generation, preview, approval, secure storage.
-   Tenant document view.
-   Renewal workflow.

**Acceptance:** Correct fields populate a draft; missing required data
blocks generation; prior versions remain intact.

### Phase 5 --- Rent management

-   Rent ledger and payment records.
-   Monthly charge generation.
-   Partial payments and outstanding balances.
-   Rent dashboard and audit trail.

**Acceptance:** Charges are not duplicated on rerun; balances are
correct for full and partial payments.

### Phase 6 --- Website inbox and email

-   Floating website messenger.
-   Manager inbox and human handover.
-   Email notifications in sandbox first.
-   Delivery logs and retries.

**Acceptance:** Messages link to the correct contact/property where
known; sandbox sends no real external messages.

### Phase 7 --- WhatsApp integration

-   Meta test-number integration.
-   Webhooks and message templates.
-   Coexistence eligibility/onboarding plan for client's existing
    number.
-   Production checklist, approval, and monitoring.

**Acceptance:** Test messages and webhook events work; no live number is
migrated without explicit approval.

### Phase 8 --- Move-in/out, maintenance, reporting

-   Checklists and status history.
-   Maintenance ticketing.
-   Occupancy, rent, contract, and notification reports.

**Acceptance:** End-to-end rental lifecycle is traceable.

### Phase 9 --- Production hardening

-   Security review.
-   Backups and restore testing.
-   Observability and alerts.
-   Rate limits and abuse protection.
-   Performance checks.
-   Deployment and rollback documentation.
-   Client handover and staff guide.

------------------------------------------------------------------------

## 24. Environment variables and secrets

First inspect the current environment configuration. Add only variables
needed by implemented integrations. Provide an `.env.example` with
placeholder values and descriptions; never place real credentials in it.

Potential variables (names may be adapted to existing conventions): -
`DATABASE_URL` - Authentication/session secrets required by the existing
stack - Private storage credentials - Email provider API key and sender
address - `WHATSAPP_ACCESS_TOKEN` - `WHATSAPP_PHONE_NUMBER_ID` -
`WHATSAPP_BUSINESS_ACCOUNT_ID` - `WHATSAPP_WEBHOOK_VERIFY_TOKEN` - Any
required app secret used for webhook signature verification - Optional
AI provider key

Requirements: - Validate required variables at startup. - Fail with a
clear safe error if an enabled integration lacks configuration. - Do not
log secret values. - Do not expose server secrets with public
prefixes. - Keep test and production credentials separate. - Document
how to configure local development and deployment environments.

------------------------------------------------------------------------

## 25. Seed/demo data

If the app lacks useful test data, create clearly labelled demo records
only in a safe development/seed process.

Example demo property: - Apartment with a mix of private and shared
rooms. - A shared room with three beds. - One occupied bed, one reserved
bed, and one available bed. - A few fictional applicants and tenants. -
Example rent charges and payments. - Example contract template with fake
names and a visible "DEMO --- NOT A LEGAL CONTRACT" label.

Never seed real personal information. Never use demo data as if it were
live client data.

------------------------------------------------------------------------

## 26. Definition of done

A phase is complete only when: - Its acceptance criteria are met. -
Existing working behaviour is preserved. - Relevant tests/lint/type
checks/build are run and results reported. - Migrations and
configuration changes are documented. - Permissions are enforced
server-side. - Loading, empty, error, and success states are
implemented. - No secrets or real personal data are committed. -
External messages are disabled in development unless explicitly enabled
for a test recipient. - Important assumptions and limitations are
documented.

------------------------------------------------------------------------

## 27. Final instruction to Cursor

Start with **Phase 0 only**.

Inspect the repository and return an accurate audit before making large
changes. Do not assume the live site reveals the whole codebase. Do not
rebuild the application based only on the public website. Identify the
current stack and preserve it where practical.

Then propose the first small implementation change that creates the most
value with the least risk. Implement one phase at a time, show the files
changed, explain any schema changes, run available checks, and report
what remains unfinished.

The first milestone is a stable, secure foundation for properties,
physical rooms/beds, applications, and transaction-safe allocation.
Contract generation, rent automation, email, and WhatsApp should build
on that foundation in later phases.

**Reference URL:** https://rentalrooms.vercel.app/
