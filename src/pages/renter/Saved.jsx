import { PageHeader, EmptyState, ButtonLink } from "../../components/ui";
import { FiHeart, FiSearch } from "react-icons/fi";

export default function RenterSaved() {
  return (
    <div>
      <PageHeader title="Saved Homes" subtitle="Your favorite listings" />
      <EmptyState 
        icon={FiHeart} 
        title="No saved homes yet" 
        description="When you save listings, they'll appear here for easy access."
        action={<ButtonLink to="/my-home/discover"><FiSearch className="h-4 w-4 mr-2" />Discover Homes</ButtonLink>}
      />
    </div>
  );
}
