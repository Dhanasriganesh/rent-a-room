import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBell,
  FiCheckCircle,
  FiFileText,
  FiGrid,
  FiHome,
  FiSearch,
  FiUsers,
  FiLayers,
  FiArrowRight,
} from "react-icons/fi";

const NAV = [
  { id: "overview", label: "Overview", icon: FiGrid },
  { id: "owners", label: "Owners", icon: FiHome },
  { id: "inventory", label: "Inventory", icon: FiLayers },
  { id: "applicants", label: "Applicants", icon: FiUsers },
  { id: "contracts", label: "Contracts", icon: FiFileText },
];

const APPLICANTS = [
  { id: "1", name: "Maya K.", place: "Berlin · Room 2B", status: "Viewing", tone: "orange" },
  { id: "2", name: "Jonas R.", place: "Munich · Studio", status: "Allocated", tone: "ink" },
  { id: "3", name: "Aisha M.", place: "Hamburg · Loft", status: "In review", tone: "gold" },
  { id: "4", name: "Leon S.", place: "Cologne · Room 1A", status: "Contract", tone: "ink" },
  { id: "5", name: "Priya N.", place: "Frankfurt · Bed 3", status: "New", tone: "orange" },
];

const OWNERS = [
  { id: "o1", name: "Schmidt Living", city: "Berlin", beds: 14 },
  { id: "o2", name: "Alpen Haus", city: "Munich", beds: 8 },
  { id: "o3", name: "Hafen Rooms", city: "Hamburg", beds: 11 },
];

const BEDS = [
  { id: "b1", label: "Room 2B · Bed A", property: "Kreuzberg House", status: "Available" },
  { id: "b2", label: "Studio 1", property: "Maxvorstadt", status: "Reserved" },
  { id: "b3", label: "Loft Bed 2", property: "Sternschanze", status: "Occupied" },
  { id: "b4", label: "Room 1A", property: "Ehrenfeld", status: "Available" },
];

/**
 * Fully operable demo of the mediation admin panel (runs inside the landing tablet).
 */
export default function DemoAdminPanel() {
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(APPLICANTS[0].id);
  const [statusFilter, setStatusFilter] = useState("All");
  const [toast, setToast] = useState("");
  const [allocated, setAllocated] = useState({});

  const filteredApplicants = useMemo(() => {
    return APPLICANTS.filter((a) => {
      const q = query.trim().toLowerCase();
      const matchQ = !q || a.name.toLowerCase().includes(q) || a.place.toLowerCase().includes(q);
      const matchS = statusFilter === "All" || a.status === statusFilter;
      return matchQ && matchS;
    });
  }, [query, statusFilter]);

  const selected = APPLICANTS.find((a) => a.id === selectedId) || filteredApplicants[0];

  function flash(msg) {
    setToast(msg);
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => setToast(""), 2200);
  }

  function allocate() {
    if (!selected) return;
    setAllocated((prev) => ({ ...prev, [selected.id]: true }));
    flash(`Allocated bed for ${selected.name}`);
  }

  return (
    <div className="demo-admin">
      <aside className="demo-admin__side">
        <div className="demo-admin__brand">
          <span className="demo-admin__mark">HR</span>
          <div>
            <p className="demo-admin__brand-name">HomeRental</p>
            <p className="demo-admin__brand-sub">Desk console</p>
          </div>
        </div>
        <nav className="demo-admin__nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`demo-admin__nav-btn${tab === item.id ? " is-active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                <Icon />
                {item.label}
              </button>
            );
          })}
        </nav>
        <Link to="/login" className="demo-admin__cta">
          Open real desk
          <FiArrowRight />
        </Link>
      </aside>

      <div className="demo-admin__main">
        <header className="demo-admin__top">
          <label className="demo-admin__search">
            <FiSearch />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search owners, rooms, applicants…"
            />
          </label>
          <button type="button" className="demo-admin__icon-btn" aria-label="Notifications" onClick={() => flash("3 new enquiries")}>
            <FiBell />
            <span className="demo-admin__dot" />
          </button>
          <span className="demo-admin__demo-pill">Demo mode</span>
        </header>

        {tab === "overview" && (
          <div className="demo-admin__body">
            <div className="demo-admin__hello">
              <h2>Good day, Desk</h2>
              <p>Live mediation workspace — try the tabs, search, and allocate.</p>
            </div>
            <div className="demo-admin__stats">
              {[
                { label: "Active owners", value: "48", accent: false },
                { label: "Open beds", value: "126", accent: true },
                { label: "In review", value: "19", accent: false },
                { label: "Contracts due", value: "7", accent: false },
              ].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className={`demo-admin__stat${s.accent ? " is-accent" : ""}`}
                  onClick={() => flash(`${s.label}: ${s.value}`)}
                >
                  <span>{s.label}</span>
                  <strong>{s.value}</strong>
                </button>
              ))}
            </div>
            <div className="demo-admin__panel">
              <div className="demo-admin__panel-head">
                <h3>Applicant queue</h3>
                <div className="demo-admin__filters">
                  {["All", "New", "Viewing", "Allocated"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={statusFilter === f ? "is-active" : ""}
                      onClick={() => setStatusFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <ul className="demo-admin__list">
                {filteredApplicants.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`demo-admin__row${selectedId === row.id ? " is-selected" : ""}`}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <span className="demo-admin__row-name">{row.name}</span>
                      <span className="demo-admin__row-place">{row.place}</span>
                      <span className={`demo-admin__pill demo-admin__pill--${row.tone}`}>
                        {allocated[row.id] ? "Allocated" : row.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "applicants" && (
          <div className="demo-admin__body demo-admin__split">
            <div className="demo-admin__panel">
              <h3>Applicants</h3>
              <ul className="demo-admin__list">
                {filteredApplicants.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`demo-admin__row${selectedId === row.id ? " is-selected" : ""}`}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <span className="demo-admin__row-name">{row.name}</span>
                      <span className="demo-admin__row-place">{row.place}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="demo-admin__detail">
              {selected ? (
                <>
                  <h3>{selected.name}</h3>
                  <p>{selected.place}</p>
                  <p className={`demo-admin__pill demo-admin__pill--${selected.tone}`}>{selected.status}</p>
                  <button type="button" className="demo-admin__primary" onClick={allocate}>
                    <FiCheckCircle /> Allocate bed
                  </button>
                  <button type="button" className="demo-admin__ghost" onClick={() => flash(`Message drafted to ${selected.name}`)}>
                    Message applicant
                  </button>
                </>
              ) : (
                <p>Select an applicant</p>
              )}
            </div>
          </div>
        )}

        {tab === "owners" && (
          <div className="demo-admin__body">
            <h3>Owners</h3>
            <ul className="demo-admin__cards">
              {OWNERS.filter((o) => !query || o.name.toLowerCase().includes(query.toLowerCase())).map((o) => (
                <li key={o.id}>
                  <button type="button" className="demo-admin__card" onClick={() => flash(`Opened ${o.name}`)}>
                    <strong>{o.name}</strong>
                    <span>{o.city}</span>
                    <em>{o.beds} beds</em>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "inventory" && (
          <div className="demo-admin__body">
            <h3>Inventory</h3>
            <ul className="demo-admin__list">
              {BEDS.map((b) => (
                <li key={b.id}>
                  <button type="button" className="demo-admin__row" onClick={() => flash(`${b.label} · ${b.status}`)}>
                    <span className="demo-admin__row-name">{b.label}</span>
                    <span className="demo-admin__row-place">{b.property}</span>
                    <span className="demo-admin__pill demo-admin__pill--ink">{b.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "contracts" && (
          <div className="demo-admin__body">
            <h3>Contracts</h3>
            <div className="demo-admin__detail">
              <p>7 drafts ready to issue this week.</p>
              <button type="button" className="demo-admin__primary" onClick={() => flash("Opened contract templates")}>
                <FiFileText /> Browse templates
              </button>
              <button type="button" className="demo-admin__ghost" onClick={() => flash("Issued sample contract PDF")}>
                Issue sample PDF
              </button>
            </div>
          </div>
        )}

        {toast && <div className="demo-admin__toast">{toast}</div>}
      </div>
    </div>
  );
}
