import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicCatalog } from "../../lib/firestore";
import { ButtonLink, Spinner } from "../../components/ui";
import {
  FiHome,
  FiKey,
  FiMessageSquare,
  FiFileText,
  FiArrowRight,
  FiCheckCircle,
  FiMapPin,
} from "react-icons/fi";

const steps = [
  {
    title: "Browse properties",
    text: "See rooms the desk is offering. No account is required to look.",
  },
  {
    title: "Send an enquiry",
    text: "Leave your name and email on a property. The desk reviews it with you.",
  },
  {
    title: "Sign in when invited",
    text: "After you are accepted, the desk emails a login. You do not create the account yourself.",
  },
];

const perks = [
  { icon: FiHome, title: "Verified rooms", text: "Inventory checked by the mediation desk." },
  { icon: FiKey, title: "Clear handovers", text: "Move-in and move-out steps you can follow." },
  { icon: FiFileText, title: "Contracts & rent", text: "Drafts, charges, and payments in My Home after you are placed." },
  { icon: FiMessageSquare, title: "Human replies", text: "Chat with staff — no invented availability." },
];

function rentLabel(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `€${Math.round(n)}`;
}

export default function Home() {
  const [properties, setProperties] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await getPublicCatalog();
        if (!cancelled) {
          setProperties(catalog.properties || []);
          setListings(catalog.listings || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setProperties([]);
          setListings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const previewProperties = properties.slice(0, 6);
  const previewListings = listings.slice(0, 3);

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
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8 lg:pb-24 lg:pt-20">
          <p className="font-serif text-4xl font-medium tracking-tight text-[#2C1810] sm:text-6xl lg:text-7xl">
            HomeRental
          </p>
          <h1 className="mt-3 max-w-xl text-xl font-semibold leading-snug text-[#2C1810]/85 sm:mt-4 sm:text-3xl">
            Rooms mediated with care — from first look to keys in hand.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#2C1810]/60 sm:mt-4 sm:text-base">
            Browse available properties below. Enquire without an account. The desk
            sends your login only after you are accepted.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:mt-10 sm:w-auto sm:flex-row sm:flex-wrap">
            <ButtonLink
              to="/properties"
              className="w-full justify-center gap-2 !rounded-full !bg-[#2C1810] hover:!bg-[#3a2218] sm:w-auto"
            >
              View properties
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
        </div>
      </section>

      <section id="properties" className="scroll-mt-20 border-t border-[#2C1810]/08 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-3xl font-medium text-[#2C1810] sm:text-4xl">
                Properties
              </h2>
              <p className="mt-3 max-w-xl text-[#2C1810]/55">
                Rooms the mediation desk is offering now. Open one to send an enquiry.
              </p>
            </div>
            {listings.length > 0 && (
              <Link
                to="/listings"
                className="text-sm font-medium text-[#FF8C00] hover:underline"
              >
                Owner listings
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : previewProperties.length === 0 && previewListings.length === 0 ? (
            <div className="mt-10 rounded-[1.5rem] border border-white/55 bg-white/40 p-8 text-center">
              <FiHome className="mx-auto h-8 w-8 text-[#2C1810]/40" />
              <p className="mt-3 font-semibold text-[#2C1810]">No properties listed yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#2C1810]/55">
                When the desk marks a property active, it appears here. You can still
                message the team from the chat button.
              </p>
            </div>
          ) : (
            <>
              {previewProperties.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-6 lg:grid-cols-3">
                  {previewProperties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              )}
              {properties.length > previewProperties.length && (
                <p className="mt-6 text-sm text-[#2C1810]/50">
                  Showing {previewProperties.length} of {properties.length} properties.
                </p>
              )}
              {previewListings.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-lg font-semibold text-[#2C1810]">Published listings</h3>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
                    {previewListings.map((listing) => (
                      <Link
                        key={listing.id}
                        to={`/listings/${listing.id}`}
                        className="overflow-hidden rounded-2xl border border-white/55 bg-white/50"
                      >
                        <div className="aspect-[16/10] bg-[#2C1810]/5">
                          {listing.images?.[0] ? (
                            <img
                              src={listing.images[0]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <FiHome className="h-8 w-8 text-[#2C1810]/30" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <p className="font-semibold text-[#2C1810]">{listing.title}</p>
                          <p className="mt-1 flex items-center gap-1 text-sm text-[#2C1810]/55">
                            <FiMapPin className="h-4 w-4" />
                            {listing.city || "Location on request"}
                          </p>
                          {rentLabel(listing.rentAmount) && (
                            <p className="mt-2 text-sm font-semibold text-[#FF8C00]">
                              {rentLabel(listing.rentAmount)}
                              <span className="font-normal text-[#2C1810]/45"> / month</span>
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="border-t border-[#2C1810]/08 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl font-medium text-[#2C1810] sm:text-4xl">
            How renting works here
          </h2>
          <p className="mt-3 max-w-xl text-[#2C1810]/55">
            Look first. The desk creates your login when a room is yours.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-6">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/55 bg-white/40 p-3 backdrop-blur-sm sm:rounded-[1.5rem] sm:p-6"
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
          <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-5 lg:grid-cols-4">
            {perks.map((perk) => {
              const PerkIcon = perk.icon;
              return (
                <div
                  key={perk.title}
                  className="rounded-xl border border-white/50 bg-white/35 p-3 sm:rounded-2xl sm:p-5"
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
                Staff allocate beds, issue contracts, track rent, and send tenant logins.
                Active properties show on this page automatically.
              </p>
              <ul className="mt-6 space-y-2.5">
                {[
                  "Inventory of rooms & beds",
                  "Public property catalogue",
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
              <p className="text-sm text-[#F3EBE3]/50">Already have a login?</p>
              <p className="mt-2 text-2xl font-semibold text-white">Use the email from the desk</p>
              <p className="mt-3 text-sm leading-relaxed text-[#F3EBE3]/60">
                Tenants do not register themselves. Sign in with the temporary password,
                then choose your own on the first visit.
              </p>
              <ButtonLink
                to="/login"
                variant="outline"
                className="mt-6 gap-2 !rounded-full !border-[#F3EBE3]/30 !text-[#F3EBE3] hover:!bg-white/10"
              >
                Sign in
                <FiArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PropertyCard({ property }) {
  const available = Number(property.availableBeds) || 0;
  const price = rentLabel(property.fromRent);
  return (
    <Link
      to={`/properties/${property.id}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-white/55 bg-white/50 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="aspect-[16/10] bg-[#2C1810]/5">
        {property.images?.[0] ? (
          <img src={property.images[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FiHome className="h-8 w-8 text-[#2C1810]/30" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-[#2C1810] sm:text-base">{property.name || "Property"}</h3>
        <span className="mt-1 inline-block max-w-full truncate rounded-full bg-[#2C1810]/5 px-1.5 py-0.5 text-[10px] text-[#2C1810]/70 sm:px-2 sm:text-xs">
          {available > 0 ? `${available} available` : "Ask the desk"}
        </span>
        <p className="mt-1 flex items-center gap-1 text-sm text-[#2C1810]/55">
          <FiMapPin className="h-4 w-4 shrink-0" />
          {[property.city, String(property.propertyType || "").replaceAll("_", " ")]
            .filter(Boolean)
            .join(" · ") || "Germany"}
        </p>
        {property.description && (
          <p className="mt-2 hidden text-sm text-[#2C1810]/60 sm:line-clamp-2 sm:block">{property.description}</p>
        )}
        <p className="mt-auto pt-2 text-xs font-semibold text-[#FF8C00] sm:pt-3 sm:text-sm">
          {price ? (
            <>
              From {price}
              <span className="font-normal text-[#2C1810]/45"> / month</span>
            </>
          ) : (
            <span className="font-normal text-[#2C1810]/45">Rent confirmed with the desk</span>
          )}
        </p>
      </div>
    </Link>
  );
}
