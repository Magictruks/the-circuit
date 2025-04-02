import React, { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, ChevronDown, Loader2 } from 'lucide-react';
import RouteCard from './RouteCard';
import { RouteData, AppView } from '../../types';
import { supabase } from '../../supabaseClient'; // Import Supabase client

interface RoutesScreenProps {
  activeGymId: string | null;
  activeGymName: string;
  onNavigate: (view: AppView, routeId?: string) => void;
}

const RoutesScreen: React.FC<RoutesScreenProps> = ({ activeGymId, activeGymName, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [routes, setRoutes] = useState<RouteData[]>([]); // State for fetched routes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // TODO: Add state for actual filters (grade, wall, status, sort)

  // Fetch routes when activeGymId changes
  useEffect(() => {
    const fetchRoutes = async () => {
      if (!activeGymId) {
        setRoutes([]); // Clear routes if no gym is selected
        setError(null);
        setLoading(false);
        return;
      }

      console.log(`[RoutesScreen] Fetching routes for gym ID: ${activeGymId}`);
      setLoading(true);
      setError(null);
      setRoutes([]); // Clear previous routes

      try {
        const { data, error: fetchError } = await supabase
          .from('routes')
          .select('*') // Select all columns
          .eq('gym_id', activeGymId) // Filter by the active gym
          .order('date_set', { ascending: false }); // Order by newest first

        if (fetchError) {
          console.error('[RoutesScreen] Error fetching routes:', fetchError);
          setError(`Failed to load routes: ${fetchError.message}`);
          setRoutes([]);
        } else if (data) {
          console.log('[RoutesScreen] Routes fetched successfully:', data);
          // Map Supabase data (snake_case) to RouteData (camelCase where needed)
          // Note: Supabase client might handle this automatically depending on config,
          // but explicit mapping is safer if needed. Here, we assume direct mapping works for now.
          // We need to map `grade_color` -> `gradeColor` for the RouteCard component.
          // Also add placeholder/default values for status/betaAvailable for now.
          const mappedData: RouteData[] = data.map(route => ({
            ...route,
            gradeColor: route.grade_color, // Map snake_case to camelCase
            dateSet: route.date_set, // Ensure correct field name
            imageUrl: route.image_url, // Ensure correct field name
            // Add placeholder status/beta for UI compatibility until implemented
            status: 'unseen', // Placeholder
            betaAvailable: Math.random() > 0.5, // Placeholder
          }));
          setRoutes(mappedData);
        } else {
          setRoutes([]); // No data found
        }
      } catch (err) {
        console.error("[RoutesScreen] Unexpected error fetching routes:", err);
        setError("An unexpected error occurred while fetching routes.");
        setRoutes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [activeGymId]); // Re-run effect when activeGymId changes

  // Memoize filtered routes to avoid recalculation on every render
  const filteredRoutes = useMemo(() => {
    return routes.filter(route =>
      (route.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (route.grade?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (route.location?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      // TODO: Add more filtering based on filter state
    );
  }, [routes, searchTerm]); // Recalculate only when routes or searchTerm change

  // --- Render Logic ---

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
        {loading ? (
          <div className="flex justify-center items-center pt-10">
            <Loader2 className="animate-spin text-accent-blue mr-2" size={24} />
            <p className="text-brand-gray">Loading routes...</p>
          </div>
        ) : error ? (
          <p className="text-center text-red-500 mt-8">{error}</p>
        ) : filteredRoutes.length > 0 ? (
          filteredRoutes.map(route => (
            <RouteCard
              key={route.id}
              route={route}
              onClick={() => onNavigate('routeDetail', route.id)} // Pass navigation action
            />
          ))
        ) : (
          <p className="text-center text-gray-500 mt-8">
            {routes.length === 0 ? 'No routes found for this gym yet.' : 'No routes found matching your criteria.'}
          </p>
        )}
      </main>

      {/* Bottom Navigation is rendered in App.tsx */}
    </div>
  );
};

export default RoutesScreen;
