import React, { useState } from 'react';
import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import RouteCard from './RouteCard';
import { RouteData, AppView } from '../../types'; // Import AppView

interface RoutesScreenProps {
  activeGymId: string | null;
  activeGymName: string;
  onNavigate: (view: AppView, routeId?: string) => void; // Add navigation handler prop
}

// --- Placeholder Data ---
const placeholderRoutes: RouteData[] = [
  { id: 'r1', name: 'Crimson Dyno', grade: 'V5', gradeColor: 'accent-red', location: 'Overhang Cave', setter: 'Admin', dateSet: '2024-03-10', status: 'sent', betaAvailable: true, description: 'Explosive move off the starting holds to a big jug.', imageUrl: 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { id: 'r2', name: 'Blue Traverse', grade: 'V3', gradeColor: 'accent-blue', location: 'Slab Wall', setter: 'Admin', dateSet: '2024-03-08', status: 'attempted', betaAvailable: false, description: 'Technical footwork required on small holds.' },
  { id: 'r3', name: 'Sunshine Arete', grade: 'V4', gradeColor: 'accent-yellow', location: 'Main Boulder', setter: 'Jane D.', dateSet: '2024-03-05', status: 'unseen', betaAvailable: true, description: 'Balancey moves up the arete feature.', imageUrl: 'https://images.unsplash.com/photo-1610414870675-5579095849e1?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { id: 'r4', name: 'Green Slab Master', grade: 'V2', gradeColor: 'brand-green', location: 'Slab Wall', setter: 'Admin', dateSet: '2024-03-01', status: 'sent', betaAvailable: false },
  { id: 'r5', name: 'Purple Pain', grade: 'V6', gradeColor: 'accent-purple', location: 'Overhang Cave', setter: 'Mike R.', dateSet: '2024-02-28', status: 'unseen', betaAvailable: true },
  { id: 'r6', name: 'The Gray Crack', grade: 'V1', gradeColor: 'brand-gray', location: 'Training Area', setter: 'Admin', dateSet: '2024-02-25', status: 'attempted', betaAvailable: false },
];
// --- End Placeholder Data ---

const RoutesScreen: React.FC<RoutesScreenProps> = ({ activeGymId, activeGymName, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  // TODO: Add state for actual filters (grade, wall, status, sort)

  // TODO: Implement filtering logic based on state
  const filteredRoutes = placeholderRoutes.filter(route =>
    route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.location.toLowerCase().includes(searchTerm.toLowerCase())
    // Add filtering based on activeGymId if routes were gym-specific
  );

  if (!activeGymId) {
    return <div className="p-4 pt-16 text-center text-brand-gray">Please select a gym first.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Area */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-center text-brand-green mb-4">{activeGymName} - Routes</h1>
        <div className="flex gap-2 items-center">
          {/* Search Bar */}
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search routes by name, grade, wall..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue bg-gray-100"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 text-brand-gray"
            aria-label="Filters"
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </header>

      {/* Filter Options (Conditional) */}
      {showFilters && (
        <div className="bg-white p-4 border-b border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold mb-2 text-brand-gray">Filter & Sort</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {/* Placeholder Filter Dropdowns/Buttons */}
            <button className="flex justify-between items-center p-2 border rounded bg-gray-50 text-brand-gray hover:border-gray-400">Grade <ChevronDown size={16}/></button>
            <button className="flex justify-between items-center p-2 border rounded bg-gray-50 text-brand-gray hover:border-gray-400">Wall/Area <ChevronDown size={16}/></button>
            <button className="flex justify-between items-center p-2 border rounded bg-gray-50 text-brand-gray hover:border-gray-400">Status <ChevronDown size={16}/></button>
            <button className="flex justify-between items-center p-2 border rounded bg-gray-50 text-brand-gray hover:border-gray-400">Sort By <ChevronDown size={16}/></button>
          </div>
           {/* TODO: Implement actual filter components and logic */}
        </div>
      )}

      {/* Route List */}
      <main className="flex-grow p-4 space-y-3 overflow-y-auto pb-20">
        {filteredRoutes.length > 0 ? (
          filteredRoutes.map(route => (
            <RouteCard
              key={route.id}
              route={route}
              onClick={() => onNavigate('routeDetail', route.id)} // Pass navigation action
            />
          ))
        ) : (
          <p className="text-center text-gray-500 mt-8">No routes found matching your criteria.</p>
        )}
      </main>

      {/* Bottom Navigation is rendered in App.tsx */}
    </div>
  );
};

export default RoutesScreen;
