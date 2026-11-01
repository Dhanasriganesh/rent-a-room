import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiDollarSign,
  FiFileText,
  FiGrid,
  FiHome,
  FiInbox,
  FiKey,
  FiLink,
  FiMessageSquare,
  FiRadio,
  FiSearch,
  FiTool,
  FiUsers,
} from "react-icons/fi";

/** Same sections as the real mediation desk nav */
const NAV = [
  { id: "overview", label: "Overview", icon: FiGrid },
  { id: "owners", label: "Owners", icon: FiUsers },
  { id: "properties", label: "Properties", icon: FiHome },
  { id: "inventory", label: "Rooms & Beds", icon: FiKey },
  { id: "share-links", label: "Share links", icon: FiLink },
  { id: "applicants", label: "Applicants", icon: FiInbox },
  { id: "allocations", label: "Allocation", icon: FiClipboard },
  { id: "contracts", label: "Rental Documents", icon: FiFileText },
  { id: "rent", label: "Rent", icon: FiDollarSign },
  { id: "messages", label: "Messages", icon: FiMessageSquare },
  { id: "whatsapp", label: "WhatsApp", icon: FiRadio },
  { id: "maintenance", label: "Maintenance", icon: FiTool },
  { id: "lifecycle", label: "Move-in/out", icon: FiCalendar },
  { id: "reports", label: "Reports", icon: FiBarChart2 },
];

const SEED_APPLICANTS = [
  { id: "a1", name: "Maya Keller", city: "Berlin", room: "Kreuzberg · 2B", status: "viewing_scheduled", note: "Prefers quiet flatshare" },
  { id: "a2", name: "Jonas Richter", city: "Munich", room: "Maxvorstadt · Studio", status: "allocated", note: "Move-in 1 Dec" },
  { id: "a3", name: "Aisha Mensah", city: "Hamburg", room: "Sternschanze · Loft", status: "under_review", note: "Needs Anmeldung" },
  { id: "a4", name: "Leon Schäfer", city: "Cologne", room: "Ehrenfeld · 1A", status: "approved", note: "Contract draft ready" },
  { id: "a5", name: "Priya Nair", city: "Frankfurt", room: "Sachsenhausen · Bed 3", status: "new", note: "First enquiry today" },
];

const SEED_OWNERS = [
  { id: "o1", name: "Schmidt Living", city: "Berlin", properties: 3, beds: 14, email: "hello@schmidt.living" },
  { id: "o2", name: "Alpen Haus GmbH", city: "Munich", properties: 2, beds: 8, email: "desk@alpenhaus.de" },
  { id: "o3", name: "Hafen Rooms", city: "Hamburg", properties: 1, beds: 11, email: "team@hafenrooms.de" },
];

const SEED_PROPERTIES = [
  { id: "p1", name: "Kreuzberg House", city: "Berlin", type: "Apartment Building", available: 4 },
  { id: "p2", name: "Maxvorstadt Studio Block", city: "Munich", type: "House", available: 1 },
  { id: "p3", name: "Sternschanze Loft", city: "Hamburg", type: "Mixed Use", available: 2 },
];

const SEED_BEDS = [
  { id: "b1", label: "Room 2B · Bed A", property: "Kreuzberg House", status: "available", rent: 520 },
  { id: "b2", label: "Studio 1", property: "Maxvorstadt Studio Block", status: "reserved", rent: 780 },
  { id: "b3", label: "Loft Bed 2", property: "Sternschanze Loft", status: "occupied", rent: 640 },
  { id: "b4", label: "Room 1A · Bed B", property: "Kreuzberg House", status: "available", rent: 495 },
];

const STATUS_LABEL = {
  new: "New",
  under_review: "In review",
  viewing_scheduled: "Viewing",
  allocated: "Allocated",
  approved: "Approved",
};

const STATUS_TONE = {
  new: "green",
  under_review: "gold",
  viewing_scheduled: "green",
  allocated: "ink",
  approved: "ink",
};

/**
 * Operable mediation desk console — same IA as /manager, local demo data.
 * Runs inside the landing tablet so visitors can click through the real product.
 */
export default function DeskConsole() {
  const [page, setPage] = useState("overview");
  const [search, setSearch] = useState("");
  const [applicants, setApplicants] = useState(SEED_APPLICANTS);
  const [selectedId, setSelectedId] = useState(SEED_APPLICANTS[0].id);
  const [toast, setToast] = useState("");
  const [messages, setMessages] = useState([
    { id: "m1", from: "Maya Keller", text: "Is viewing still Tuesday 16:00?", unread: true },
    { id: "m2", from: "Schmidt Living", text: "Room 2B photos updated.", unread: true },
    { id: "m3", from: "Jonas Richter", text: "Deposit transfer sent.", unread: false },
  ]);

  const selected = applicants.find((a) => a.id === selectedId) || applicants[0];

  function flash(msg) {
    setToast(msg);
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => setToast(""), 2400);
  }

  function setStatus(id, status) {
    setApplicants((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    flash(`Status → ${STATUS_LABEL[status] || status}`);
  }

  const q = search.trim().toLowerCase();

  const overviewLinks = useMemo(
    () =>
      NAV.filter((n) => n.id !== "overview").filter(
        (n) => !q || n.label.toLowerCase().includes(q)
      ),
    [q]
  );

  const filteredApplicants = applicants.filter(
    (a) =>
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.room.toLowerCase().includes(q)
  );

  return (
    <div className="desk-console">
      <aside className="desk-console__nav">
        <div className="desk-console__brand">
          <span className="desk-console__mark">HR</span>
          <div>
            <p className="desk-console__brand-title">HomeRental</p>
            <p className="desk-console__brand-sub">Mediation desk</p>
          </div>
        </div>
        <div className="desk-console__nav-scroll">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`desk-console__nav-item${page === item.id ? " is-active" : ""}`}
                onClick={() => {
                  setPage(item.id);
                  setSearch("");
                }}
              >
                <span className="desk-console__nav-chip">
                  <Icon />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        <Link to="/login" className="desk-console__login">
          Staff sign in
        </Link>
      </aside>

      <section className="desk-console__main">
        <header className="desk-console__top">
          <label className="desk-console__search">
            <FiSearch />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the desk…"
            />
          </label>
          <span className="desk-console__live">Live demo</span>
        </header>

        <div className="desk-console__body">
          {page === "overview" && (
            <div className="desk-console__stack">
              <h2 className="desk-console__h1">Welcome, Manager</h2>
              <div className="desk-console__stats">
                {[
                  ["Owners", SEED_OWNERS.length],
                  ["Properties", SEED_PROPERTIES.length],
                  ["Open beds", SEED_BEDS.filter((b) => b.status === "available").length],
                  ["Applicants", applicants.length],
                ].map(([label, value]) => (
                  <button
                    key={label}
                    type="button"
                    className="desk-console__stat"
                    onClick={() =>
                      setPage(
                        label === "Owners"
                          ? "owners"
                          : label === "Properties"
                            ? "properties"
                            : label === "Open beds"
                              ? "inventory"
                              : "applicants"
                      )
                    }
                  >
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </button>
                ))}
              </div>
              <div className="desk-console__shortcut-grid">
                {overviewLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="desk-console__card"
                      onClick={() => setPage(item.id)}
                    >
                      <div>
                        <p>{item.label}</p>
                        <span>Open desk page</span>
                      </div>
                      <Icon />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {page === "owners" && (
            <div className="desk-console__stack">
              <h2 className="desk-console__h1">Owners</h2>
              <ul className="desk-console__list">
                {SEED_OWNERS.filter(
                  (o) => !q || o.name.toLowerCase().includes(q) || o.city.toLowerCase().includes(q)
                ).map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      className="desk-console__row"
                      onClick={() => flash(`Opened ${o.name}`)}
                    >
                      <div>
                        <strong>{o.name}</strong>
                        <span>
                          {o.city} · {o.properties} properties · {o.beds} beds
                        </span>
                      </div>
                      <em>{o.email}</em>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {page === "properties" && (
            <div className="desk-console__stack">
              <h2 className="desk-console__h1">Properties</h2>
              <ul className="desk-console__list">
                {SEED_PROPERTIES.filter(
                  (p) => !q || p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q)
                ).map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="desk-console__row"
                      onClick={() => flash(`Opened ${p.name}`)}
                    >
                      <div>
                        <strong>{p.name}</strong>
                        <span>
                          {p.city} · {p.type}
                        </span>
                      </div>
                      <em>{p.available} available</em>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {page === "inventory" && (
            <div className="desk-console__stack">
              <h2 className="desk-console__h1">Rooms & Beds</h2>
              <ul className="desk-console__list">
                {SEED_BEDS.filter(
                  (b) =>
                    !q ||
                    b.label.toLowerCase().includes(q) ||
                    b.property.toLowerCase().includes(q)
                ).map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      className="desk-console__row"
                      onClick={() => flash(`${b.label} marked reviewed`)}
                    >
                      <div>
                        <strong>{b.label}</strong>
                        <span>
                          {b.property} · €{b.rent}/mo
                        </span>
                      </div>
                      <span className={`desk-console__pill desk-console__pill--${b.status === "available" ? "green" : "ink"}`}>
                        {b.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {page === "applicants" && (
            <div className="desk-console__split">
              <div className="desk-console__stack">
                <h2 className="desk-console__h1">Applicants</h2>
                <ul className="desk-console__list">
                  {filteredApplicants.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        className={`desk-console__row${selectedId === a.id ? " is-selected" : ""}`}
                        onClick={() => setSelectedId(a.id)}
                      >
                        <div>
                          <strong>{a.name}</strong>
                          <span>
                            {a.city} · {a.room}
                          </span>
                        </div>
                        <span className={`desk-console__pill desk-console__pill--${STATUS_TONE[a.status]}`}>
                          {STATUS_LABEL[a.status]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {selected && (
                <div className="desk-console__detail">
                  <h3>{selected.name}</h3>
                  <p>
                    {selected.room}
                    <br />
                    {selected.note}
                  </p>
                  <span className={`desk-console__pill desk-console__pill--${STATUS_TONE[selected.status]}`}>
                    {STATUS_LABEL[selected.status]}
                  </span>
                  <div className="desk-console__actions">
                    <button type="button" onClick={() => setStatus(selected.id, "viewing_scheduled")}>
                      Schedule viewing
                    </button>
                    <button type="button" onClick={() => setStatus(selected.id, "allocated")}>
                      <FiCheckCircle /> Allocate bed
                    </button>
                    <button type="button" className="is-ghost" onClick={() => setStatus(selected.id, "under_review")}>
                      Request more info
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {page === "allocations" && (
            <div className="desk-console__stack">
              <h2 className="desk-console__h1">Allocation</h2>
              <ul className="desk-console__list">
                {applicants
                  .filter((a) => a.status === "allocated" || a.status === "approved")
                  .map((a) => (
                    <li key={a.id}>
                      <div className="desk-console__row static">
                        <div>
                          <strong>{a.name}</strong>
                          <span>{a.room}</span>
                        </div>
                        <span className="desk-console__pill desk-console__pill--ink">Placed</span>
                      </div>
                    </li>
                  ))}
              </ul>
              <button type="button" className="desk-console__primary" onClick={() => setPage("applicants")}>
                Allocate from applicants
              </button>
            </div>
          )}

          {page === "contracts" && (
            <div className="desk-console__stack">
              <h2 className="desk-console__h1">Rental Documents</h2>
              <div className="desk-console__detail">
                <p>7 drafts ready · 2 awaiting signature</p>
                <div className="desk-console__actions">
                  <button type="button" onClick={() => flash("Opened contract templates")}>
                    Browse templates
                  </button>
                  <button type="button" className="is-ghost" onClick={() => flash("Issued sample PDF")}>
                    Issue sample PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {page === "rent" && (
            <div className="desk-console__stack">
              <h2 className="desk-console__h1">Rent</h2>
              <div className="desk-console__stats">
                {[
                  ["Charged", "€18.4k"],
                  ["Collected", "€15.1k"],
                  ["Outstanding", "€3.3k"],
                  ["Overdue", "€820"],
                ].map(([label, value]) => (
                  <button key={label} type="button" className="desk-console__stat" onClick={() => flash(`${label}: ${value}`)}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </button>
                ))}
              </div>
              <button type="button" className="desk-console__primary" onClick={() => flash("Generated November charges")}>
                Generate monthly charges
              </button>
            </div>
          )}

          {page === "messages" && (
            <div className="desk-console__stack">
              <h2 className="desk-console__h1">Messages</h2>
              <ul className="desk-console__list">
                {messages.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className="desk-console__row"
                      onClick={() => {
                        setMessages((prev) =>
                          prev.map((x) => (x.id === m.id ? { ...x, unread: false } : x))
                        );
                        flash(`Opened thread with ${m.from}`);
                      }}
                    >
                      <div>
                        <strong>
                          {m.from}
                          {m.unread ? " · unread" : ""}
                        </strong>
                        <span>{m.text}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {page === "whatsapp" && (
            <div className="desk-console__stack">
              <h2 className="desk-console__h1">WhatsApp</h2>
              <div className="desk-console__detail">
                <p>Sandbox delivery ready. Send a test ping to a desk number.</p>
                <button type="button" className="desk-console__primary" onClick={() => flash("WhatsApp sandbox message queued")}>
                  Send test message
                </button>
              </div>
            </div>
          )}

          {page === "maintenance" && (
            <div className="desk-console__stack">
              <h2 className="desk-console__h1">Maintenance</h2>
              <ul className="desk-console__list">
                {[
                  ["Heating slow in 2B", "High"],
                  ["Broken lock — Studio 1", "Urgent"],
                  ["Dryer noise", "Low"],
                ].map(([title, urgency]) => (
                  <li key={title}>
                    <button type="button" className="desk-console__row" onClick={() => flash(`Ticket: ${title}`)}>
                      <div>
                        <strong>{title}</strong>
                        <span>Ticket open</span>
                      </div>
                      <em>{urgency}</em>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {page === "lifecycle" && (
            <div className="desk-console__stack">
              <h2 className="desk-console__h1">Move-in / Move-out</h2>
              <div className="desk-console__detail">
                <p>3 move-ins this week · 1 move-out checklist pending</p>
                <button type="button" className="desk-console__primary" onClick={() => flash("Opened move-in checklist")}>
                  Open checklist
                </button>
              </div>
            </div>
          )}

          {page === "share-links" && (
            <div className="desk-console__stack">
              <h2 className="desk-console__h1">Share links</h2>
              <div className="desk-console__detail">
                <p className="desk-console__mono">homerental.app/browse/kreuzberg-winter</p>
                <button type="button" className="desk-console__primary" onClick={() => flash("Share link copied")}>
                  Copy private browse URL
                </button>
              </div>
            </div>
          )}

          {page === "reports" && (
            <div className="desk-console__stack">
              <h2 className="desk-console__h1">Reports</h2>
              <div className="desk-console__shortcut-grid">
                {["Inventory by status", "Applications funnel", "Rent reconciliation"].map((label) => (
                  <button key={label} type="button" className="desk-console__card" onClick={() => flash(`Opened ${label}`)}>
                    <div>
                      <p>{label}</p>
                      <span>Operations report</span>
                    </div>
                    <FiBarChart2 />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {toast && <div className="desk-console__toast">{toast}</div>}
      </section>
    </div>
  );
}
