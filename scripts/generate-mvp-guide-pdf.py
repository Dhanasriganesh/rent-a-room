#!/usr/bin/env python3
"""Generate a clear MVP showcase PDF for renters and property managers."""

from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "RentalRooms_MVP_User_Guide.pdf"

COCOA = (44, 24, 16)
ORANGE = (255, 140, 0)
CREAM = (243, 235, 227)
MUTED = (92, 74, 66)
WHITE = (255, 255, 255)
SOFT = (120, 100, 90)


def ascii(text: str) -> str:
    """Core PDF fonts are Latin-1; keep showcase text compatible."""
    return (
        str(text)
        .replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2026", "...")
        .replace("\u2192", "->")
        .replace("\u00b7", "|")
        .encode("latin-1", "replace")
        .decode("latin-1")
    )


class GuidePDF(FPDF):
    def cell(self, *args, **kwargs):
        if args and isinstance(args[-1] if len(args) >= 1 else None, str):
            pass
        # fpdf cell signature: w, h=0, text="", ...
        if "text" in kwargs and isinstance(kwargs["text"], str):
            kwargs["text"] = ascii(kwargs["text"])
        elif len(args) >= 3 and isinstance(args[2], str):
            args = list(args)
            args[2] = ascii(args[2])
            args = tuple(args)
        return super().cell(*args, **kwargs)

    def multi_cell(self, *args, **kwargs):
        if "text" in kwargs and isinstance(kwargs["text"], str):
            kwargs["text"] = ascii(kwargs["text"])
        elif len(args) >= 3 and isinstance(args[2], str):
            args = list(args)
            args[2] = ascii(args[2])
            args = tuple(args)
        return super().multi_cell(*args, **kwargs)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_fill_color(*CREAM)
        self.rect(0, 0, self.w, 12, "F")
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*SOFT)
        self.set_xy(14, 4)
        self.cell(0, 5, "RentalRooms MVP  |  How it works", align="L")
        self.set_xy(14, 4)
        self.cell(0, 5, f"{self.page_no()}", align="R")
        self.ln(10)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*SOFT)
        self.cell(0, 5, "Internal showcase  |  Not a legal contract  |  Mediation desk MVP", align="C")

    def cover(self):
        self.add_page()
        self.set_fill_color(*CREAM)
        self.rect(0, 0, self.w, self.h, "F")

        # Accent bar
        self.set_fill_color(*COCOA)
        self.rect(0, 0, 8, self.h, "F")
        self.set_fill_color(*ORANGE)
        self.rect(8, 0, 3, self.h, "F")

        self.set_xy(28, 48)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*ORANGE)
        self.cell(0, 8, "PRODUCT SHOWCASE")

        self.set_xy(28, 62)
        self.set_font("Helvetica", "B", 28)
        self.set_text_color(*COCOA)
        self.multi_cell(160, 12, "How RentalRooms works")

        self.set_xy(28, 95)
        self.set_font("Helvetica", "", 13)
        self.set_text_color(*MUTED)
        self.multi_cell(
            155,
            7,
            "A clear guide for renters (users) and property managers "
            "(your mediation admin desk).\n\n"
            "This MVP helps you take a room from enquiry to move-in, "
            "rent tracking, messages, maintenance, and move-out — "
            "in one place.",
        )

        self.set_xy(28, 160)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*COCOA)
        self.cell(0, 7, "Who this is for")
        self.ln(10)
        self.set_x(28)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(*MUTED)
        self.multi_cell(
            155,
            6.5,
            "1. Renters / applicants — browse rooms, apply, track status, pay rent, message the desk\n"
            "2. Property managers (Admin) — run the whole operation from one staff desk\n"
            "3. Property owners (CRM) — recorded in the system; owner login is separate if used",
        )

        self.set_xy(28, 230)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*SOFT)
        self.cell(0, 5, "MVP version  ·  Germany / EUR  ·  Bank-transfer rent reconciliation")

    def h1(self, text):
        self.ln(4)
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*COCOA)
        self.cell(0, 9, text)
        self.ln(8)
        self.set_draw_color(*ORANGE)
        self.set_line_width(0.6)
        self.line(self.l_margin, self.get_y(), self.l_margin + 40, self.get_y())
        self.ln(5)

    def h2(self, text):
        self.ln(3)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*COCOA)
        self.cell(0, 7, text)
        self.ln(7)

    def body(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*MUTED)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def bullet(self, text):
        x = self.l_margin
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*ORANGE)
        self.cell(5, 5.5, "-")
        self.set_text_color(*MUTED)
        self.multi_cell(0, 5.5, text)
        self.set_x(x)

    def step(self, num, title, detail):
        # Number chip
        y = self.get_y()
        if y > self.h - 40:
            self.add_page()
            y = self.get_y()
        self.set_fill_color(*COCOA)
        self.set_text_color(*WHITE)
        self.set_font("Helvetica", "B", 10)
        self.set_xy(self.l_margin, y)
        self.cell(8, 8, str(num), align="C", fill=True)
        self.set_xy(self.l_margin + 11, y)
        self.set_text_color(*COCOA)
        self.set_font("Helvetica", "B", 11)
        self.cell(0, 5, title)
        self.ln(5.5)
        self.set_x(self.l_margin + 11)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*MUTED)
        self.multi_cell(0, 5.2, detail)
        self.ln(2.5)

    def callout(self, title, text):
        self.ln(2)
        x, y = self.l_margin, self.get_y()
        self.set_fill_color(255, 248, 240)
        self.set_draw_color(*ORANGE)
        # estimate height
        self.set_font("Helvetica", "", 9.5)
        # simple box
        self.rect(x, y, self.w - self.l_margin - self.r_margin, 22, "DF")
        self.set_xy(x + 4, y + 3)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*COCOA)
        self.cell(0, 5, title)
        self.set_xy(x + 4, y + 9)
        self.set_font("Helvetica", "", 9.5)
        self.set_text_color(*MUTED)
        self.multi_cell(self.w - self.l_margin - self.r_margin - 8, 4.8, text)
        self.set_y(y + 24)


def build():
    pdf = GuidePDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(18, 18, 18)

    # --- Cover ---
    pdf.cover()

    # --- Big picture ---
    pdf.add_page()
    pdf.h1("1. The big picture")
    pdf.body(
        "RentalRooms is a mediation platform. Your company sits in the middle: "
        "you manage owners' properties and rooms, review people who want to rent, "
        "allocate beds, issue contract drafts, track rent, and handle day-to-day messages."
    )
    pdf.h2("Roles at a glance")
    pdf.bullet("Renter (user) — public website + \"My Home\" after login")
    pdf.bullet("Admin / Property manager — one staff desk at /manager (this is you)")
    pdf.bullet("Owner (CRM record) — owners you manage; optional separate owner login")
    pdf.ln(2)
    pdf.h2("End-to-end journey")
    pdf.body(
        "Browse rooms  →  Apply  →  Staff review  →  Approve  →  Allocate bed  →  "
        "Contract draft  →  Issue  →  Move-in checklist  →  Rent each month  →  "
        "Messages / maintenance  →  Move-out checklist  →  Bed available again"
    )
    pdf.callout(
        "Important",
        "Availability is never guessed in chat. Staff confirm from inventory. "
        "Contract drafts are not signed legal instruments until your process says so. "
        "WhatsApp/email stay in sandbox until you approve go-live.",
    )

    # --- Renters ---
    pdf.add_page()
    pdf.h1("2. For renters (users)")
    pdf.body(
        "Renters discover rooms on the public site, apply online, and manage their "
        "application, documents, rent, and messages from My Home."
    )

    pdf.h2("What renters can do")
    pdf.step(1, "Browse listings", "Open the website → Browse Listings. Filter by city (e.g. Berlin, Munich). Open a room for details.")
    pdf.step(2, "Create an account", "Register as a renter (public sign-up). Staff accounts are invite-only.")
    pdf.step(3, "Apply for a room", "On a listing, choose Apply. Enter move-in date and short profile details. Submit.")
    pdf.step(4, "Track the application", "My Home → Applications shows status (new, under review, approved, rejected, allocated…).")
    pdf.step(5, "Message the desk", "Website chat or in-app messages. A human replies — the system does not invent free beds.")
    pdf.step(6, "Contracts & documents", "My Home → Documents: view issued contracts and request renewals when offered.")
    pdf.step(7, "Pay rent (MVP)", "My Home → Rent shows charges. MVP uses bank transfer; staff mark payments when received.")
    pdf.step(8, "Maintenance requests", "Raise issues linked to their tenancy / allocation for staff to triage.")

    pdf.callout(
        "Renter tip",
        "Sign in once, then use \"My Home\" from the public header. Sign out when finished on a shared computer.",
    )

    # --- Property managers ---
    pdf.add_page()
    pdf.h1("3. For property managers (Admin desk)")
    pdf.body(
        "Everything for day-to-day mediation lives under /manager — one floating glass sidebar, "
        "one desk. After login as admin you land here."
    )

    pdf.h2("Setup (do this first)")
    pdf.step(1, "Owners", "Create CRM owner records for the landlords you mediate for.")
    pdf.step(2, "Properties", "Add buildings / apartments linked to those owners.")
    pdf.step(3, "Rooms & Beds", "Define physical inventory. Beds can be available, reserved, occupied, or in maintenance.")
    pdf.step(4, "Optional migration", "If you had legacy \"units\", migrate carefully after backup.")

    pdf.h2("Daily pipeline")
    pdf.step(1, "Applicants", "Review new applications. Request more info, schedule viewing notes, approve or reject.")
    pdf.step(2, "Allocation", "Only after approval: reserve a specific bed for dates. The system blocks double-booking.")
    pdf.step(3, "Contracts", "Generate a draft from a template → staff approve → issue. Keep drafts private.")
    pdf.step(4, "Move-in", "Open Move-in/out → checklist (keys, condition, instructions…). Complete only when every item is checked.")
    pdf.step(5, "Rent", "Generate monthly charges. Record bank payments. Adjust or refresh overdue statuses as needed.")
    pdf.step(6, "Messages / WhatsApp", "Answer website and in-app threads. WhatsApp starts in sandbox (test only) until approved.")
    pdf.step(7, "Maintenance", "Create/triage tickets. Urgent means escalate to a person — no automatic emergency dispatch.")
    pdf.step(8, "Move-out", "Checklist including notice confirmation and bed reopen. Then inventory can show available again.")
    pdf.step(9, "Reports", "Snapshot occupancy, rent outstanding, tickets, and delivery logs for the desk.")

    # --- Screens map ---
    pdf.add_page()
    pdf.h1("4. Where to click (Admin map)")
    pdf.body("Use the left floating sidebar. Active item is the dark cocoa pill.")
    rows = [
        ("Overview", "Shortcuts into the desk"),
        ("Owners / Properties / Rooms & Beds", "Inventory foundation"),
        ("Applicants / Allocation", "Who gets which bed"),
        ("Contracts", "Drafts, approve, issue, renewals"),
        ("Rent", "Charges, payments, overdue"),
        ("Messages / WhatsApp", "Inbox + sandbox messaging"),
        ("Maintenance / Move-in/out", "Tickets and lifecycle checklists"),
        ("Reports", "Operational snapshot"),
        ("Users / Audit / Settings", "Access, history, hardening flags"),
    ]
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*COCOA)
    pdf.cell(70, 7, "Menu", border=0)
    pdf.cell(0, 7, "Purpose", border=0)
    pdf.ln(7)
    pdf.set_draw_color(220, 210, 200)
    for i, (a, b) in enumerate(rows):
        if i % 2 == 0:
            pdf.set_fill_color(250, 245, 240)
            pdf.rect(pdf.l_margin, pdf.get_y(), pdf.w - pdf.l_margin - pdf.r_margin, 7, "F")
        pdf.set_font("Helvetica", "B", 9.5)
        pdf.set_text_color(*COCOA)
        pdf.cell(70, 7, a)
        pdf.set_font("Helvetica", "", 9.5)
        pdf.set_text_color(*MUTED)
        pdf.cell(0, 7, b)
        pdf.ln(7)

    pdf.ln(6)
    pdf.h2("Renter map")
    pdf.bullet("Public: Home, Browse Listings, Listing detail + Apply")
    pdf.bullet("My Home: Overview, Applications, Tenancy, Rent, Documents, Messages, Requests, Settings")

    # --- Example walkthrough ---
    pdf.add_page()
    pdf.h1("5. Example walkthrough (one room)")
    pdf.body("Imagine Owner Schmidt has a shared flat in Berlin with three beds. One bed is free.")

    pdf.step(1, "Staff prepares inventory", "Owner → Property \"Berlin Mitte\" → Room \"Shared 2\" → Bed B3 = available.")
    pdf.step(2, "Renter applies", "Anna browses Berlin listings, applies for 1 Nov move-in.")
    pdf.step(3, "Staff reviews", "Applicants → open Anna → approve after checks.")
    pdf.step(4, "Allocate", "Allocation → assign Bed B3 → status reserved. Other staff cannot double-book B3.")
    pdf.step(5, "Contract", "Contracts → draft → approve → issue to Anna.")
    pdf.step(6, "Move-in day", "Move-in/out checklist completed → allocation active, bed occupied.")
    pdf.step(7, "Each month", "Rent → generate period → Anna transfers → staff records payment → charge paid.")
    pdf.step(8, "If something breaks", "Maintenance ticket (e.g. plumbing) → triage → resolve with history.")
    pdf.step(9, "When Anna leaves", "Move-out checklist → allocation ended → bed held for cleaning or reopened.")

    # --- Safety ---
    pdf.add_page()
    pdf.h1("6. Rules of the road (MVP)")
    pdf.h2("Always")
    pdf.bullet("Confirm beds from Rooms & Beds — never invent availability in chat")
    pdf.bullet("Approve applications before allocating")
    pdf.bullet("Finish every move-in / move-out checklist item before completing")
    pdf.bullet("Keep WhatsApp and email in sandbox until written go-live approval")
    pdf.bullet("Treat contract drafts as internal until issued through your process")

    pdf.h2("Never")
    pdf.bullet("Put API tokens in the browser / Vite environment")
    pdf.bullet("Share full contract bodies publicly")
    pdf.bullet("Skip notice / keys / reopen steps on move-out")
    pdf.bullet("Expect automatic legal conclusions — flags need a human")

    pdf.h2("If something goes wrong")
    pdf.bullet("Settings → turn on Maintenance mode (blocks new apply/chat)")
    pdf.bullet("Check Audit log for who changed what")
    pdf.bullet("Follow deploy/rollback notes in the project docs if a release misbehaves")

    # --- Closing ---
    pdf.ln(8)
    pdf.h1("7. Quick start checklist")
    pdf.body("Print this page and tick as you demo.")
    checks = [
        "Admin can sign in and open /manager",
        "Create one Owner, one Property, one Room, two Beds",
        "Publish or link a listing path renters can open",
        "Renter registers, applies, sees application in My Home",
        "Staff approves → allocates one bed → second allocate fails (double-book guard)",
        "Contract draft → approve → issue",
        "Move-in checklist completed",
        "Generate rent charge → record a test payment",
        "Website chat appears in Messages (human reply)",
        "WhatsApp sandbox test send logs only (no live send)",
        "Create a maintenance ticket and change status",
        "Open Reports and see occupancy / rent snapshot",
    ]
    for c in checks:
        y = pdf.get_y()
        if y > pdf.h - 22:
            pdf.add_page()
        pdf.set_draw_color(*COCOA)
        pdf.rect(pdf.l_margin, pdf.get_y() + 1.2, 4, 4)
        pdf.set_x(pdf.l_margin + 7)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*MUTED)
        pdf.multi_cell(0, 6, c)
        pdf.ln(1)

    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*COCOA)
    pdf.cell(0, 6, "Questions during a demo?")
    pdf.ln(7)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(
        0,
        5.5,
        "Show Inventory first (truth of beds), then Applicants → Allocation → Contracts → Rent. "
        "That order matches how real mediation work flows.",
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
