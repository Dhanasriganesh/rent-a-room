import { Link } from "react-router-dom";
import { FiHome, FiArrowLeft } from "react-icons/fi";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4">
      <div className="text-center">
        <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <FiHome className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="mt-4 text-xl text-gray-600">Page not found</p>
        <p className="mt-2 text-gray-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-primary-dark"
          >
            <FiArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <Link
            to="/listings"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Browse Listings
          </Link>
        </div>
      </div>
    </div>
  );
}
