import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicCatalog } from "../../lib/firestore";
import { Spinner } from "../../components/ui";
import { FiHome, FiMapPin } from "react-icons/fi";

function rentLabel(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `€${Math.round(n)}`;
}

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await getPublicCatalog();
        if (!cancelled) setProperties(catalog.properties || []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setProperties([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl font-medium text-[#2C1810] sm:text-4xl">Properties</h1>
      <p className="mt-3 max-w-xl text-[#2C1810]/55">
        Rooms the mediation desk is offering. Open one to send an enquiry — no account needed.
      </p>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : properties.length === 0 ? (
        <div className="mt-10 rounded-[1.5rem] border border-white/55 bg-white/40 p-8 text-center">
          <FiHome className="mx-auto h-8 w-8 text-[#2C1810]/40" />
          <p className="mt-3 font-semibold text-[#2C1810]">No properties listed yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#2C1810]/55">
            When the desk marks a property active, it appears here.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-6 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
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
        <h2 className="line-clamp-2 text-sm font-semibold leading-tight text-[#2C1810] sm:text-base">{property.name || "Property"}</h2>
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
