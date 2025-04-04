import React, { useState, useEffect, useMemo, useCallback } from 'react';
    import { Search, SlidersHorizontal, ChevronDown, Loader2, MapPin } from 'lucide-react'; // Added MapPin
    import RouteCard from './RouteCard';
    import { RouteData, AppView, UserRouteProgressData, LocationData } from '../../types'; // Added LocationData
    import { supabase } from '../../supabaseClient';
    import type { User } from '@supabase/supabase-js';

    interface RoutesScreenProps {
      activeGymId: string | null;
      activeGymName: string;
      onNavigate: (view: AppView, data?: string | { routeId?: string; searchTerm?: string }) => void; // Updated data type
      initialSearchTerm?: string;
      currentUser: User | null;
    }

    // Helper type for count results from RPC
    type CountResult = { route_id: string; count: number };

    const RoutesScreen: React.FC<RoutesScreenProps> = ({
      activeGymId,
      activeGymName,
      onNavigate,
      initialSearchTerm,
      currentUser,
    }) => {
      const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
      const [showFilters, setShowFilters] = useState(false);
      const [baseRoutes, setBaseRoutes] = useState<RouteData[]>([]); // Raw routes from DB (now includes location_name)
      const [userProgressMap, setUserProgressMap] = useState<Map<string, UserRouteProgressData>>(new Map());
      const [betaCountsMap, setBetaCountsMap] = useState<Map<string, number>>(new Map());
      const [commentCountsMap, setCommentCountsMap] = useState<Map<string, number>>(new Map());
      const [gymLocations, setGymLocations] = useState<LocationData[]>([]); // State for locations
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);

      // Filter State
      const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>(''); // '' means All Locations
      // TODO: Add state for other filters (grade, status, sort)

      useEffect(() => {
        setSearchTerm(initialSearchTerm || '');
      }, [initialSearchTerm]);

      // Fetch all data when activeGymId or currentUser changes
      useEffect(() => {
        const fetchAllRouteData = async () => {
          if (!activeGymId) {
            setBaseRoutes([]);
            setUserProgressMap(new Map());
            setBetaCountsMap(new Map());
            setCommentCountsMap(new Map());
            setGymLocations([]); // Clear locations
            setError(null);
            setLoading(false);
            return;
          }

          console.log(`[RoutesScreen] Fetching all data for gym ID: ${activeGymId}`);
          setLoading(true);
          setError(null);
          setBaseRoutes([]); // Clear previous data
          setUserProgressMap(new Map());
          setBetaCountsMap(new Map());
          setCommentCountsMap(new Map());
          setGymLocations([]); // Clear locations

          try {
            // 0. Fetch Locations for the Gym
            const { data: locationsData, error: locationsError } = await supabase
              .from('locations')
              .select('*')
              .eq('gym_id', activeGymId)
              .order('name', { ascending: true });

            if (locationsError) {
              console.error('[RoutesScreen] Error fetching locations:', locationsError.message);
              // Continue fetching routes even if locations fail, but maybe show a warning?
            } else {
              setGymLocations(locationsData || []);
            }

            // 1. Fetch Base Routes with Location Name
            const { data: routesData, error: routesError } = await supabase
              .from('routes')
              .select(`
                *,
                location_name:locations ( name )
              `) // Select all route columns and the location name via join
              .eq('gym_id', activeGymId)
              .order('date_set', { ascending: false });

            if (routesError) throw new Error(`Failed to load routes: ${routesError.message}`);
            if (!routesData || routesData.length === 0) {
              setBaseRoutes([]);
              setLoading(false);
              return; // No routes, no need to fetch related data
            }

            // Map the data to include location_name directly
            const mappedRoutes = routesData.map(r => ({
              ...r,
              // Supabase returns joined data as an object or array, extract the name
              location_name: (r.location_name as any)?.name || null, // Handle potential null location
            }));

            setBaseRoutes(mappedRoutes as RouteData[]); // Set base routes first
            const routeIds = mappedRoutes.map(r => r.id);

            // 2. Fetch User Progress (only if user is logged in)
            let progressMap = new Map<string, UserRouteProgressData>();
            if (currentUser && routeIds.length > 0) {
              const { data: progressData, error: progressError } = await supabase
                .from('user_route_progress')
                .select('*')
                .eq('user_id', currentUser.id)
                .in('route_id', routeIds);

              if (progressError) console.error('[RoutesScreen] Error fetching user progress:', progressError.message);
              else if (progressData) {
                progressData.forEach(p => progressMap.set(p.route_id, p));
              }
              setUserProgressMap(progressMap);
            }

            // 3. Fetch Beta Counts using RPC
            let betaMap = new Map<string, number>();
            if (routeIds.length > 0) {
              const { data: betaCountsData, error: betaCountsError } = await supabase.rpc('get_route_beta_counts', { route_ids: routeIds });
              if (betaCountsError) console.error('[RoutesScreen] Error fetching beta counts via RPC:', betaCountsError.message);
              else if (betaCountsData) {
                (betaCountsData as CountResult[]).forEach(item => betaMap.set(item.route_id, item.count));
              }
              setBetaCountsMap(betaMap);
            }

            // 4. Fetch Comment Counts using RPC
            let commentMap = new Map<string, number>();
            if (routeIds.length > 0) {
              const { data: commentCountsData, error: commentCountsError } = await supabase.rpc('get_route_comment_counts', { route_ids: routeIds });
              if (commentCountsError) console.error('[RoutesScreen] Error fetching comment counts via RPC:', commentCountsError.message);
              else if (commentCountsData) {
                (commentCountsData as CountResult[]).forEach(item => commentMap.set(item.route_id, item.count));
              }
              setCommentCountsMap(commentMap);
            }

          } catch (err: any) {
            console.error("[RoutesScreen] Unexpected error fetching route data:", err);
            setError(err.message || "An unexpected error occurred.");
            setBaseRoutes([]);
            setUserProgressMap(new Map());
            setBetaCountsMap(new Map());
            setCommentCountsMap(new Map());
            setGymLocations([]);
          } finally {
            setLoading(false);
          }
        };

        fetchAllRouteData();
      }, [activeGymId, currentUser]); // Re-run when gym or user changes

      // Memoize augmented and filtered routes
      const augmentedAndFilteredRoutes = useMemo(() => {
        // Augment base routes with related data
        const augmentedRoutes = baseRoutes.map(route => {
          const progress = userProgressMap.get(route.id);
          const betaCount = betaCountsMap.get(route.id) || 0;
          const commentCount = commentCountsMap.get(route.id) || 0;

          let status: 'sent' | 'attempted' | 'unseen' = 'unseen';
          if (progress?.sent_at) {
            status = 'sent';
          } else if (progress?.attempts && progress.attempts > 0) {
            status = 'attempted';
          }

          return {
            ...route, // Includes location_name from the fetch
            status: status,
            hasBeta: betaCount > 0,
            hasComments: commentCount > 0,
            hasNotes: !!progress?.notes && progress.notes.trim().length > 0,
            rating: progress?.rating,
            isOnWishlist: !!progress?.wishlist,
          };
        });

        // Apply filters
        let currentRoutes = augmentedRoutes;

        // Search Term Filter
        if (searchTerm) {
          const lowerSearchTerm = searchTerm.toLowerCase();
          currentRoutes = currentRoutes.filter(route =>
            (route.name?.toLowerCase() || '').includes(lowerSearchTerm) ||
            (route.grade?.toLowerCase() || '').includes(lowerSearchTerm) ||
            (route.location_name?.toLowerCase() || '').includes(lowerSearchTerm) || // Search by location name
            (route.location?.toLowerCase() || '').includes(lowerSearchTerm) // Also search old location text
          );
        }

        // Location Filter
        if (selectedLocationFilter) {
          currentRoutes = currentRoutes.filter(route => route.location_id === selectedLocationFilter);
        }

        // TODO: Apply other filters (grade, status) here based on filter state

        // TODO: Apply sorting here based on sort state

        return currentRoutes;
      }, [baseRoutes, userProgressMap, betaCountsMap, commentCountsMap, searchTerm, selectedLocationFilter]); // Add selectedLocationFilter dependency

      // --- Render Logic ---

      if (!activeGymId && !loading) {
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
                  placeholder="Search routes by name, grade, location..." // Updated placeholder
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
                {/* Location Filter Dropdown */}
                <div className="relative">
                  <select
                    value={selectedLocationFilter}
                    onChange={(e) => setSelectedLocationFilter(e.target.value)}
                    className="w-full appearance-none bg-gray-50 border border-gray-300 rounded p-2 pr-8 text-brand-gray hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-blue"
                  >
                    <option value="">All Locations</option>
                    {gymLocations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {/* Placeholder Filter Dropdowns/Buttons */}
                <button className="flex justify-between items-center p-2 border rounded bg-gray-50 text-brand-gray hover:border-gray-400">Grade <ChevronDown size={16}/></button>
                <button className="flex justify-between items-center p-2 border rounded bg-gray-50 text-brand-gray hover:border-gray-400">Status <ChevronDown size={16}/></button>
                <button className="flex justify-between items-center p-2 border rounded bg-gray-50 text-brand-gray hover:border-gray-400">Sort By <ChevronDown size={16}/></button>
              </div>
               {/* TODO: Implement actual filter components and logic for Grade, Status, Sort */}
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
            ) : augmentedAndFilteredRoutes.length > 0 ? (
              augmentedAndFilteredRoutes.map(route => (
                <RouteCard
                  key={route.id}
                  route={route}
                  onClick={() => onNavigate('routeDetail', { routeId: route.id })} // Pass object for clarity
                />
              ))
            ) : (
              <p className="text-center text-gray-500 mt-8">
                {baseRoutes.length === 0 ? 'No routes found for this gym yet.' : 'No routes found matching your criteria.'}
              </p>
            )}
          </main>

          {/* Bottom Navigation is rendered in App.tsx */}
        </div>
      );
    };

    export default RoutesScreen;
