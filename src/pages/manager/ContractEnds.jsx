import { useEffect, useMemo, useState } from "react";
import { getAllContracts, getAllProperties } from "../../lib/firestore";
import { CONTRACT_STATUSES } from "../../lib/constants";
import {
  PageHeader,
  Card,
  EmptyState,
  Spinner,
  Select,
  Alert,
  Badge,
  SearchBox,
  matchesQuery,
} from "../../components/ui";
import { FiCalendar } from "react-icons/fi";

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const HIDDEN = new Set(["void", "superseded"]);

function parseEndDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatEnd(date) {
  if (!date) return "No end date";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const statusLabel = (value) =>
  CONTRACT_STATUSES.find((s) => s.value === value)?.label || value || "—";

export default function ContractEnds() {
  const [contracts, setContracts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [rows, props] = await Promise.all([getAllContracts(), getAllProperties()]);
        if (!cancelled) {
          setContracts(rows);
          setProperties(props);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load contracts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const propertyName = (id) => properties.find((p) => p.id === id)?.name || "—";

  const years = useMemo(() => {
    const set = new Set([new Date().getFullYear()]);
    for (const contract of contracts) {
      const end = parseEndDate(contract.endDate);
      if (end) set.add(end.getFullYear());
    }
    return [...set].sort((a, b) => a - b);
  }, [contracts]);

  const rows = useMemo(() => {
    const today = startOfToday();
    return contracts
      .filter((contract) => showClosed || !HIDDEN.has(contract.status))
      .map((contract) => {
        const end = parseEndDate(contract.endDate);
        let leave = "open";
        if (end) leave = end.getTime() <= today.getTime() ? "can_leave" : "stays";
        return { contract, end, leave };
      })
      .filter(({ contract, end }) => {
        if (month || year) {
          if (!end) return false;
          if (month && end.getMonth() + 1 !== Number(month)) return false;
          if (year && end.getFullYear() !== Number(year)) return false;
        }
        return matchesQuery(
          search,
          contract.applicantName,
          contract.contractReference,
          contract.status,
          propertyName(contract.propertyId),
          contract.endDate
        );
      })
      .sort((a, b) => {
        if (!a.end && !b.end) return 0;
        if (!a.end) return 1;
        if (!b.end) return -1;
        return a.end - b.end;
      });
  }, [contracts, month, year, showClosed, search, properties]);

  const monthName = MONTHS.find((m) => m.value === month)?.label;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contract ends"
        subtitle="Filter by the month a contract finishes, then see who can leave and who must stay"
      />

      {error && <Alert variant="error">{error}</Alert>}

      <SearchBox value={search} onChange={setSearch} placeholder="Search tenant, property, or reference" />

      <Card className="!p-3 sm:!p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Ends in"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            placeholder="All months"
            options={MONTHS}
          />
          <Select
            label="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="All years"
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
          />
          <label className="flex items-end gap-2 pb-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => setShowClosed(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Include void and replaced
          </label>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          {rows.length} contract{rows.length === 1 ? "" : "s"}
          {monthName ? ` ending in ${monthName}` : ""}
          {year ? ` ${year}` : ""}
        </p>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiCalendar}
            title="No contracts for this filter"
            description={
              monthName
                ? `Nobody has a contract ending in ${monthName}${year ? ` ${year}` : ""}.`
                : "Generate a contract with an end date, then it will show up here."
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map(({ contract, end, leave }) => (
            <Card key={contract.id} className="!p-3 sm:!p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {contract.applicantName || "Unnamed tenant"}
                    </h3>
                    {leave === "can_leave" && <Badge variant="success">Can leave</Badge>}
                    {leave === "stays" && <Badge variant="warning">Cannot leave yet</Badge>}
                    {leave === "open" && <Badge>No end date</Badge>}
                    <Badge variant="default">{statusLabel(contract.status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {propertyName(contract.propertyId)}
                    {contract.contractReference ? ` · ${contract.contractReference}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {contract.startDate ? `Starts ${contract.startDate}` : "Start not set"}
                    {" · "}
                    Ends {formatEnd(end)}
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-800">
                  {leave === "can_leave" && "Contract finished"}
                  {leave === "stays" && `Stays until ${formatEnd(end)}`}
                  {leave === "open" && "Set an end date on the contract"}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
