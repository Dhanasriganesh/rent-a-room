import { Link } from "react-router-dom";
import { ButtonLink } from "../ui";
import {
  FiArrowRight,
  FiCheckCircle,
  FiLayers,
  FiShield,
  FiUsers,
  FiHome,
} from "react-icons/fi";

const ownerPoints = [
  "List rooms once — the desk handles viewings and placement",
  "Inventory, contracts, and rent stay in one shared workspace",
  "Your contact details stay private until a viewing is agreed",
];

const deskPoints = [
  "Owners, beds, applicants, and contracts in a single desk view",
  "Allocate rooms, issue documents, and track rent without spreadsheets",
  "Invite tenants with a login — they never self-register into chaos",
];

/**
 * HTML product story that scrolls beside the fixed 3D stage.
 */
export default function LandingNarrative() {
  return (
    <div className="landing-story">
      {/* 1 — Hero */}
      <section className="landing-panel landing-panel--hero" data-stage="hero">
        <div className="landing-panel__inner landing-panel__inner--left">
          <p className="landing-eyebrow">Room mediation platform</p>
          <h1 className="landing-brand">HomeRental</h1>
          <p className="landing-lede">
            The face of modern room mediation — built for house owners and the
            desks that place residents with care.
          </p>
          <div className="landing-actions">
            <ButtonLink to="/login" className="landing-cta landing-cta--ink gap-2">
              Enter the desk
              <FiArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink
              to="/properties"
              variant="outline"
              className="landing-cta landing-cta--outline"
            >
              See public catalogue
            </ButtonLink>
          </div>
          <p className="landing-scroll-hint">Scroll to explore the product</p>
        </div>
      </section>

      {/* 2 — Owners */}
      <section className="landing-panel" data-stage="owners">
        <div className="landing-panel__inner landing-panel__inner--left">
          <p className="landing-eyebrow">For property owners</p>
          <h2 className="landing-heading">Your rooms, introduced by a desk you trust</h2>
          <p className="landing-sub">
            HomeRental is not another public board. Owners commission the mediation
            desk — inventory stays controlled, enquiries stay human, and placements
            stay accountable.
          </p>
          <ul className="landing-bullets">
            {ownerPoints.map((item) => (
              <li key={item}>
                <FiCheckCircle className="landing-bullets__icon" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="landing-chip-row">
            <span className="landing-chip">
              <FiHome /> Portfolio clarity
            </span>
            <span className="landing-chip">
              <FiShield /> Private by default
            </span>
          </div>
        </div>
      </section>

      {/* 3 — Workspace / tablet intro (tablet is bound to this section only) */}
      <section
        id="desk-panel-section"
        className="landing-panel landing-panel--desk"
        data-stage="workspace"
      >
        <div className="landing-panel__inner landing-panel__inner--left">
          <p className="landing-eyebrow">One workspace</p>
          <h2 className="landing-heading">The admin panel that runs the whole desk</h2>
          <p className="landing-sub">
            Owners, properties, beds, applicants, contracts, rent, and messages —
            orchestrated in a single mediation console. What you see on the tablet
            is the product owners and staff open every day.
          </p>
          <div className="landing-feature-grid">
            {[
              { icon: FiLayers, title: "Inventory", text: "Rooms & beds with live status" },
              { icon: FiUsers, title: "Applicants", text: "Queue, viewing, allocation" },
              { icon: FiShield, title: "Contracts", text: "Draft, issue, and track" },
            ].map((f) => (
              <div key={f.title} className="landing-feature">
                <f.icon className="landing-feature__icon" aria-hidden="true" />
                <p className="landing-feature__title">{f.title}</p>
                <p className="landing-feature__text">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — Mediators */}
      <section className="landing-panel" data-stage="mediators">
        <div className="landing-panel__inner landing-panel__inner--left">
          <p className="landing-eyebrow">For mediators & desk staff</p>
          <h2 className="landing-heading">Place residents without losing the thread</h2>
          <p className="landing-sub">
            From first enquiry to keys in hand — allocate beds, send tenant logins,
            reconcile rent, and keep every file moving. Built for teams who mediate
            rooms across Germany.
          </p>
          <ul className="landing-bullets">
            {deskPoints.map((item) => (
              <li key={item}>
                <FiCheckCircle className="landing-bullets__icon" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <ButtonLink to="/login" className="landing-cta landing-cta--accent gap-2 mt-8">
            Staff sign in
            <FiArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>

      {/* 5 — Close */}
      <section className="landing-panel landing-panel--close" data-stage="close">
        <div className="landing-panel__inner landing-panel__inner--center">
          <p className="landing-eyebrow">HomeRental</p>
          <h2 className="landing-heading">The product behind every placement</h2>
          <p className="landing-sub landing-sub--center">
            Owners bring the rooms. The desk runs the mediation. Residents get a
            clear path to a verified home — all inside one platform.
          </p>
          <div className="landing-actions landing-actions--center">
            <ButtonLink to="/login" className="landing-cta landing-cta--ink gap-2">
              Get started
              <FiArrowRight className="h-4 w-4" />
            </ButtonLink>
            <Link to="/properties" className="landing-close__link">
              Browse public properties
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
