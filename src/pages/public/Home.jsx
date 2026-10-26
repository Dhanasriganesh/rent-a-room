import { Link } from "react-router-dom";
import { ButtonLink } from "../../components/ui";
import {
  FiHome,
  FiKey,
  FiMessageSquare,
  FiFileText,
  FiArrowRight,
  FiCheckCircle,
  FiLink,
} from "react-icons/fi";

const steps = [
  {
    title: "Open your link",
    text: "Your manager sends a private browse link — rooms are not listed on the public site.",
  },
  {
    title: "Apply once",
    text: "Send your details to the mediation desk — no chasing multiple landlords.",
  },
  {
    title: "Move in calmly",
    text: "Contract, keys, and rent tracked in one place after approval.",
  },
];

const perks = [
  { icon: FiHome, title: "Verified rooms", text: "Inventory checked by the mediation desk." },
  { icon: FiKey, title: "Clear handovers", text: "Move-in and move-out steps you can follow." },
  { icon: FiFileText, title: "Contracts & rent", text: "Drafts, charges, and payments in My Home." },
  { icon: FiMessageSquare, title: "Human replies", text: "Chat with staff — no invented availability." },
];

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 70% 20%, rgba(255,140,0,0.14), transparent 50%), linear-gradient(180deg, #F3EBE3 0%, #EDE3D7 100%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8 lg:pb-28 lg:pt-20">
          <p className="font-serif text-4xl font-medium tracking-tight text-[#2C1810] sm:text-6xl lg:text-7xl">
            HomeRental
          </p>
          <h1 className="mt-3 max-w-xl text-xl font-semibold leading-snug text-[#2C1810]/85 sm:mt-4 sm:text-3xl">
            Rooms mediated with care — from first look to keys in hand.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#2C1810]/60 sm:mt-4 sm:text-base">
            Available rooms are shared by your property manager via a private link.
            They do not appear in a public browse list on this website.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:mt-10 sm:w-auto sm:flex-row sm:flex-wrap">
            <ButtonLink
              to="/register"
              className="w-full justify-center gap-2 !rounded-full !bg-[#2C1810] hover:!bg-[#3a2218] sm:w-auto"
            >
              Create renter account
              <FiArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink
              to="/login"
              variant="outline"
              className="w-full justify-center !rounded-full !border-[#2C1810]/20 !text-[#2C1810] sm:w-auto"
            >
              Sign in
            </ButtonLink>
          </div>

          <p className="mt-6 flex items-start gap-2 text-sm text-[#2C1810]/50">
            <FiLink className="mt-0.5 h-4 w-4 shrink-0 text-[#FF8C00]" />
            Received a link? Open it directly — it looks like{" "}
            <span className="font-mono text-[#2C1810]/70">/browse/…</span>
          </p>
        </div>
      </section>

      <section className="border-t border-[#2C1810]/08 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl font-medium text-[#2C1810] sm:text-4xl">
            How renting works here
          </h2>
          <p className="mt-3 max-w-xl text-[#2C1810]/55">
            One mediation desk. Clear steps from shared link to move-in.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="rounded-[1.5rem] border border-white/55 bg-white/40 p-6 backdrop-blur-sm"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-[#FF8C00]">
                  Step {i + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-[#2C1810]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#2C1810]/60">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl font-medium text-[#2C1810] sm:text-4xl">
            Built for real rentals
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {perks.map((perk) => {
              const PerkIcon = perk.icon;
              return (
                <div
                  key={perk.title}
                  className="rounded-2xl border border-white/50 bg-white/35 p-5"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#2C1810] text-white">
                    <PerkIcon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-4 font-semibold text-[#2C1810]">{perk.title}</h3>
                  <p className="mt-1.5 text-sm text-[#2C1810]/55">{perk.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-[#2C1810]/08 bg-[#2C1810] py-16 text-[#F3EBE3] sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#FF8C00]">
                For the mediation desk
              </p>
              <h2 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">
                Owners, rooms, applicants — one workspace
              </h2>
              <p className="mt-4 text-[#F3EBE3]/65">
                Staff allocate beds, issue contracts, track rent, and share private
                browse links without listing inventory on the public site.
              </p>
              <ul className="mt-6 space-y-2.5">
                {[
                  "Inventory of rooms & beds",
                  "Private share links for applicants",
                  "Rent reconciliation & messages",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-[#F3EBE3]/80">
                    <FiCheckCircle className="h-4 w-4 shrink-0 text-[#FF8C00]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <ButtonLink
                  to="/login"
                  className="gap-2 !rounded-full !bg-[#FF8C00] !text-[#2C1810] hover:!bg-[#ffad42]"
                >
                  Staff sign in
                  <FiArrowRight className="h-4 w-4" />
                </ButtonLink>
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-white/15 bg-white/5 p-8 backdrop-blur-sm">
              <p className="text-sm text-[#F3EBE3]/50">Looking for a room?</p>
              <p className="mt-2 text-2xl font-semibold text-white">Use your manager’s link</p>
              <p className="mt-3 text-sm leading-relaxed text-[#F3EBE3]/60">
                Create a renter account so you can apply when you open the shared browse
                URL. Track status anytime in My Home.
              </p>
              <ButtonLink
                to="/register"
                variant="outline"
                className="mt-6 gap-2 !rounded-full !border-[#F3EBE3]/30 !text-[#F3EBE3] hover:!bg-white/10"
              >
                Create account
                <FiArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-serif text-3xl font-medium text-[#2C1810] sm:text-4xl">
            Ready when you are
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[#2C1810]/55">
            Create an account now, then open the browse link your manager shared.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink to="/register" className="gap-2 !rounded-full !bg-[#2C1810]">
              Create account
            </ButtonLink>
            <ButtonLink
              to="/login"
              variant="outline"
              className="!rounded-full !border-[#2C1810]/20 !text-[#2C1810]"
            >
              Sign in
            </ButtonLink>
          </div>
          <p className="mt-6 text-sm text-[#2C1810]/40">
            Owner-branded sites remain at{" "}
            <Link to="/listings" className="underline-offset-2 hover:underline">
              /listings
            </Link>{" "}
            when published by owners.
          </p>
        </div>
      </section>
    </div>
  );
}
