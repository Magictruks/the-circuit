import React, { useState, useEffect, useMemo, useCallback } from 'react';
    import { Search, SlidersHorizontal, ChevronDown, Loader2 } from 'lucide-react';
    import RouteCard from './RouteCard';
    import { RouteData, AppView, UserRouteProgressData } from '../../types';
    import { supabase } from '../../supabaseClient';
    import type { User } from '@supabase/supabase-js';

    interface RoutesScreenProps {
      activeGymId: string | null;
      activeGymName: string;
      onNavigate: (view: AppView, routeId?: string) => void;
      initialSearchTerm?: string;
      currentUser: User | null; // Add currentUser prop
    }

    // Helper type for count results from RPC
    type CountResult = { route_id: string; count: number };

    const RoutesScreen: React.FC<RoutesScreenProps> = ({
      activeGymId,
      activeGymName,
      onNavigate,
      initialSearchTerm,
      currentUser, // Destructure currentUser
    }) => {
      const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
      const [showFilters, setShowFilters] = useState(false);
      const [baseRoutes, setBaseRoutes] = useState<RouteData[]>([]); // Raw routes from DB
      const [userProgressMap, setUserProgressMap] = useState<Map<string, UserRouteProgressData>>(new Map());
      const [betaCountsMap, setBetaCountsMap] = useState<Map<string, number>>(new Map());
      const [commentCountsMap, setCommentCountsMap] = useState<Map<string, number>>(new Map());
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);
      // TODO: Add state for actual filters (grade, wall, status, sort)

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

          try {
            // 1. Fetch Base Routes
            const { data: routesData, error: routesError } = await supabase
              .from('routes')
              .select('*') // This is the query you mentioned
              .eq('gym_id', activeGymId)
              .order('date_set', { ascending: false });

            if (routesError) throw new Error(`Failed to load routes: ${routesError.message}`);
            if (!routesData || routesData.length === 0) {
              setBaseRoutes([]);
              setLoading(false);
              return; // No routes, no need to fetch related data
            }

            setBaseRoutes(routesData as RouteData[]); // Set base routes first
            const routeIds = routesData.map(r => r.id);

            // 2. Fetch User Progress (only if user is logged in)
            let progressMap = new Map<string, UserRouteProgressData>();
            if (currentUser && routeIds.length > 0) {
              const { data: progressData, error: progressError } = await supabase
                .from('user_route_progress')
                .select('*')
                .eq('user_id', currentUser.id)
                .in('route_id', routeIds);

              if (progressError) console.error('[RoutesScreen] Error fetching user progress:', progressError.message); // Log error but continue
              else if (progressData) {
                progressData.forEach(p => progressMap.set(p.route_id, p));
              }
              setUserProgressMap(progressMap);
            }

            // 3. Fetch Beta Counts using RPC
            let betaMap = new Map<string, number>();
            if (routeIds.length > 0) {
              // Use rpc call to get counts efficiently
              const { data: betaCountsData, error: betaCountsError } = await supabase.rpc('get_route_beta_counts', { route_ids: routeIds });

              if (betaCountsError) console.error('[RoutesScreen] Error fetching beta counts via RPC:', betaCountsError.message); // Log error but continue
              else if (betaCountsData) {
                (betaCountsData as CountResult[]).forEach(item => betaMap.set(item.route_id, item.count));
              }
              setBetaCountsMap(betaMap);
            }


            // 4. Fetch Comment Counts using RPC
            let commentMap = new Map<string, number>();
            if (routeIds.length > 0) {
              // Use rpc call to get counts efficiently
              const { data: commentCountsData, error: commentCountsError } = await supabase.rpc('get_route_comment_counts', { route_ids: routeIds });

              if (commentCountsError) console.error('[RoutesScreen] Error fetching comment counts via RPC:', commentCountsError.message); // Log error but continue
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

					console.log("progress notes", progress)

          return {
            ...route,
            status: status,
            hasBeta: betaCount > 0,
            hasComments: commentCount > 0,
            hasNotes: !!progress?.notes && progress.notes.trim().length > 0,
						rating: progress?.rating,
            isOnWishlist: !!progress?.wishlist,
          };
        });

        // Apply search term filter
        let currentRoutes = augmentedRoutes;
        if (searchTerm) {
          currentRoutes = currentRoutes.filter(route =>
            (route.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (route.grade?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (route.location?.toLowerCase() || '').includes(searchTerm.toLowerCase())
          );
        }

        // TODO: Apply other filters (grade, wall, status) here based on filter state

        // TODO: Apply sorting here based on sort state

        return currentRoutes;
      }, [baseRoutes, userProgressMap, betaCountsMap, commentCountsMap, searchTerm]); // Recalculate when data or searchTerm change

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
            ) : augmentedAndFilteredRoutes.length > 0 ? (
              augmentedAndFilteredRoutes.map(route => (
                <RouteCard
                  key={route.id}
                  route={route}
                  onClick={() => onNavigate('routeDetail', route.id)} // Pass navigation action
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
