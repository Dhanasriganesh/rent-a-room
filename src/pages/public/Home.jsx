import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, ButtonLink, Card } from "../../components/ui";
import {
  FiSearch,
  FiHome,
  FiUsers,
  FiShield,
  FiDollarSign,
  FiFileText,
  FiMessageSquare,
  FiCheckCircle,
  FiArrowRight,
  FiMapPin,
  FiStar,
} from "react-icons/fi";

const features = [
  {
    icon: FiHome,
    title: "Browse Verified Listings",
    description: "All properties are verified by trusted owners. Find your perfect home with detailed information and real photos.",
  },
  {
    icon: FiShield,
    title: "Secure & Transparent",
    description: "Your documents and payments are secure. No hidden fees, clear rental terms, and professional communication.",
  },
  {
    icon: FiMessageSquare,
    title: "Direct Communication",
    description: "Chat directly with property owners. Ask questions, schedule viewings, and negotiate terms easily.",
  },
  {
    icon: FiDollarSign,
    title: "Easy Rent Payments",
    description: "Pay your rent online with multiple payment methods. Track your payment history and get receipts instantly.",
  },
  {
    icon: FiFileText,
    title: "Digital Documents",
    description: "Upload and manage all your rental documents digitally. Secure storage with controlled access.",
  },
  {
    icon: FiUsers,
    title: "Multi-Tenant Support",
    description: "Perfect for shared accommodations. Each tenant has their own account with individual rent tracking.",
  },
];

const ownerFeatures = [
  "Your own branded rental website",
  "Manage multiple properties & units",
  "Automated rent collection",
  "Tenant document verification",
  "Maintenance request tracking",
  "Detailed analytics & reports",
];

const stats = [
  { value: "500+", label: "Properties Listed" },
  { value: "2,000+", label: "Happy Tenants" },
  { value: "98%", label: "Satisfaction Rate" },
  { value: "24/7", label: "Support Available" },
];

export default function Home() {
  const navigate = useNavigate();
  const [searchCity, setSearchCity] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/listings${searchCity ? `?city=${encodeURIComponent(searchCity)}` : ""}`);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero py-20 lg:py-32">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
            {/* Left content */}
            <div className="flex flex-col justify-center text-white">
              <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
                <FiStar className="h-4 w-4 text-yellow-400" />
                Trusted by thousands of renters
              </span>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                Find Your Perfect
                <span className="block text-secondary-light">Home Today</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-white/80">
                Connect directly with trusted property owners. Browse verified listings, apply online, and manage your tenancy—all in one place.
              </p>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="mt-8">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <FiMapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Enter city or location..."
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      className="w-full rounded-xl border-0 py-4 pl-12 pr-4 text-gray-900 shadow-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                  </div>
                  <Button type="submit" variant="secondary" size="lg" className="gap-2 whitespace-nowrap">
                    <FiSearch className="h-5 w-5" />
                    Search Homes
                  </Button>
                </div>
              </form>

              {/* Quick links */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/listings?city=Berlin"
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  Berlin
                </Link>
                <Link
                  to="/listings?city=Munich"
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  Munich
                </Link>
                <Link
                  to="/listings?city=Hamburg"
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  Hamburg
                </Link>
                <Link
                  to="/listings?city=Frankfurt"
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  Frankfurt
                </Link>
              </div>
            </div>

            {/* Right content - Stats */}
            <div className="flex items-center justify-center lg:justify-end">
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="rounded-2xl bg-white/10 p-6 text-center backdrop-blur-sm"
                  >
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                    <p className="mt-1 text-sm text-white/70">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything You Need for a Great Rental Experience
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-500">
              From searching for your perfect home to managing your tenancy, we've got you covered with powerful features.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="card-hover">
                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-gray-500">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* For Owners Section */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                For Property Owners
              </span>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
                Your Own Rental Business Platform
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Get your own branded rental website, manage multiple properties, collect rent automatically, and grow your rental business with powerful tools.
              </p>

              <ul className="mt-8 space-y-4">
                {ownerFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                      <FiCheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-4">
                <ButtonLink to="/register?role=owner" size="lg">
                  Get Started Free
                  <FiArrowRight className="h-5 w-5" />
                </ButtonLink>
                <ButtonLink to="/for-owners" variant="outline" size="lg">
                  Learn More
                </ButtonLink>
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="bg-primary px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Monthly Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">€12,450</p>
                    </div>
                    <div className="rounded-lg bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                      +12.5%
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-gray-50 p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">8</p>
                      <p className="text-xs text-gray-500">Properties</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">24</p>
                      <p className="text-xs text-gray-500">Units</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">95%</p>
                      <p className="text-xs text-gray-500">Occupancy</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-500">
              Finding and renting your perfect home is simple with our streamlined process.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Search & Browse",
                description: "Find listings that match your needs with powerful filters and search.",
              },
              {
                step: "02",
                title: "Connect & Apply",
                description: "Contact owners directly, schedule viewings, and submit your application.",
              },
              {
                step: "03",
                title: "Verify & Sign",
                description: "Upload required documents, review terms, and sign your rental agreement.",
              },
              {
                step: "04",
                title: "Move In & Pay",
                description: "Get your keys, move in, and manage rent payments through the platform.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-6xl font-bold text-primary/10">{item.step}</div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to Find Your New Home?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Join thousands of happy renters who found their perfect home through our platform.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <ButtonLink
              to="/listings"
              variant="secondary"
              size="lg"
              className="gap-2"
            >
              <FiSearch className="h-5 w-5" />
              Browse Listings
            </ButtonLink>
            <ButtonLink
              to="/register"
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white hover:text-primary"
            >
              Create Account
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
