import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
    import { Search, SlidersHorizontal, ChevronDown, Loader2, MapPin } from 'lucide-react';
    import RouteCard from './RouteCard';
    import { RouteData, AppView, UserRouteProgressData, LocationData, RouteCardStatsResult } from '../../types';
    import { supabase } from '../../supabaseClient';
    import type { User } from '@supabase/supabase-js';

    interface RoutesScreenProps {
      activeGymId: string | null;
      activeGymName: string;
      onNavigate: (view: AppView, data?: string | { routeId?: string; searchTerm?: string }) => void;
      initialSearchTerm?: string;
      currentUser: User | null;
    }

    // Define the structure for combined route stats
    type RouteStats = {
      textBetaCount: number;
      videoBetaCount: number;
      averageRating: number | null;
      ratingCount: number;
    };

    type RouteStatusFilter = 'all' | 'sent' | 'attempted' | 'unseen' | 'wishlist';
    type SortOption = 'date_newest' | 'grade_hardest' | 'grade_easiest' | 'rating_highest';

    // Helper to get numeric value for V-grades (consider moving to utils)
    const getVGradeValue = (grade: string): number => {
        if (grade && grade.toUpperCase().startsWith('V')) {
            const numPart = grade.substring(1);
            const rangeParts = numPart.split('-');
            const numericValue = parseInt(rangeParts[rangeParts.length - 1], 10);
            return isNaN(numericValue) ? -1 : numericValue;
        }
        return -1; // Return -1 for non-V grades or parsing errors
    };

    const ROUTE_PAGE_SIZE = 10; // Number of routes per page

    const RoutesScreen: React.FC<RoutesScreenProps> = ({
      activeGymId,
      activeGymName,
      onNavigate,
      initialSearchTerm,
      currentUser,
    }) => {
      const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
      const [showFilters, setShowFilters] = useState(false);
      // baseRoutes now holds the filtered/sorted routes from the DB for the current page
      const [baseRoutes, setBaseRoutes] = useState<RouteData[]>([]);
      const [userProgressMap, setUserProgressMap] = useState<Map<string, UserRouteProgressData>>(new Map());
      const [routeStatsMap, setRouteStatsMap] = useState<Map<string, RouteStats>>(new Map());
      const [commentCountsMap, setCommentCountsMap] = useState<Map<string, number>>(new Map());
      const [gymLocations, setGymLocations] = useState<LocationData[]>([]);
      const [loading, setLoading] = useState(false);
      const [loadingMoreRoutes, setLoadingMoreRoutes] = useState(false);
      const [error, setError] = useState<string | null>(null);
      const [currentPage, setCurrentPage] = useState(0);
      const [hasMoreRoutes, setHasMoreRoutes] = useState(true);

      // Filter States
      const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('');
      const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('');
      const [selectedStatusFilter, setSelectedStatusFilter] = useState<RouteStatusFilter>('all');
      const [selectedSortOption, setSelectedSortOption] = useState<SortOption>('date_newest');

      const searchInputRef = useRef<HTMLInputElement>(null);
      const [didFocusOnMount, setDidFocusOnMount] = useState(false);
      const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
      const isInitialMount = useRef(true); // Keep this ref

      useEffect(() => {
        setSearchTerm(initialSearchTerm || '');
        if (!initialSearchTerm) { setDidFocusOnMount(false); }
      }, [initialSearchTerm]);

      useEffect(() => {
        if (initialSearchTerm && !didFocusOnMount) {
          setTimeout(() => {
            if (searchInputRef.current) { searchInputRef.current.focus(); setDidFocusOnMount(true); }
          }, 250);
        }
      }, [initialSearchTerm, didFocusOnMount]);

      // --- Fetch Route Data (useCallback remains the same) ---
      const fetchAllRouteData = useCallback(async (page = 0, loadMore = false, currentSearchTerm = searchTerm) => {
        console.log(`[fetchAllRouteData] Called. Page: ${page}, LoadMore: ${loadMore}, Search: "${currentSearchTerm}"`);
        if (!activeGymId) {
          console.log("[fetchAllRouteData] No active gym ID, resetting state.");
          setBaseRoutes([]); setUserProgressMap(new Map()); setRouteStatsMap(new Map());
          setCommentCountsMap(new Map()); setGymLocations([]); setError(null);
          setLoading(false); setLoadingMoreRoutes(false); setHasMoreRoutes(false);
          return;
        }

        if (loadMore) { setLoadingMoreRoutes(true); }
        else {
          setLoading(true); setBaseRoutes([]); setCurrentPage(0); setHasMoreRoutes(true);
          // Reset auxiliary maps only if not loading more
          setUserProgressMap(new Map()); setRouteStatsMap(new Map()); setCommentCountsMap(new Map());
        }
        setError(null);

        const offset = page * ROUTE_PAGE_SIZE;

        try {
          // Fetch locations only on initial load (page 0)
          if (page === 0) {
            console.log("[fetchAllRouteData] Fetching locations.");
            const { data: locationsData, error: locationsError } = await supabase
              .from('locations').select('*').eq('gym_id', activeGymId).order('name', { ascending: true });
            if (locationsError) console.error('[RoutesScreen] Error fetching locations:', locationsError.message);
            else setGymLocations(locationsData || []);
          }

          console.log(`[fetchAllRouteData] Calling RPC 'get_filtered_routes' with: gym=${activeGymId}, search=${currentSearchTerm || null}, loc=${selectedLocationFilter || null}, grade=${selectedGradeFilter || null}, sort=${selectedSortOption !== 'rating_highest' ? selectedSortOption : 'date_newest'}, page=${page}, size=${ROUTE_PAGE_SIZE}`);
          // Call the RPC function with filters and pagination
          const { data: routesData, error: routesError } = await supabase.rpc('get_filtered_routes', {
            gym_id_in: activeGymId,
            search_term_in: currentSearchTerm || null, // Use the passed search term
            location_id_in: selectedLocationFilter || null,
            grade_in: selectedGradeFilter || null,
            // Pass sort option only if it's NOT rating_highest (handled client-side)
            sort_option_in: selectedSortOption !== 'rating_highest' ? selectedSortOption : 'date_newest', // Default sort if rating_highest
            page_size_in: ROUTE_PAGE_SIZE,
            page_offset_in: offset
          });

          if (routesError) throw new Error(`Failed to load routes via RPC: ${routesError.message}`);

          if (!routesData || routesData.length === 0) {
            console.log("[fetchAllRouteData] No routes found from RPC.");
            if (!loadMore) setBaseRoutes([]);
            setHasMoreRoutes(false);
            setLoading(false); setLoadingMoreRoutes(false);
            return;
          }

          // The RPC returns the basic route data, already filtered/sorted (except status/rating sort)
          const mappedRoutes = routesData as RouteData[];
          console.log(`[fetchAllRouteData] Received ${mappedRoutes.length} routes.`);

          // Append or replace routes based on loadMore flag
          setBaseRoutes(prevRoutes => loadMore ? [...prevRoutes, ...mappedRoutes] : mappedRoutes);
          setCurrentPage(page);
          setHasMoreRoutes(mappedRoutes.length === ROUTE_PAGE_SIZE);

          const routeIds = mappedRoutes.map(r => r.id);

          // Fetch auxiliary data (progress, stats, comments) for the *current page's routes*
          // We need to merge this data later in the useMemo hook

          // Fetch User Progress for current page routes
          if (currentUser && routeIds.length > 0) {
            console.log("[fetchAllRouteData] Fetching user progress for route IDs:", routeIds);
            const { data: progressData, error: progressError } = await supabase
              .from('user_route_progress').select('*').eq('user_id', currentUser.id).in('route_id', routeIds);
            if (progressError) console.error('[RoutesScreen] Error fetching user progress:', progressError.message);
            else if (progressData) {
              console.log(`[fetchAllRouteData] Received ${progressData.length} progress items.`);
              // Update the map, adding new entries or overwriting existing ones for the current page
              setUserProgressMap(prevMap => {
                 const newMap = new Map(prevMap);
                 progressData.forEach(p => newMap.set(p.route_id, p));
                 return newMap;
              });
            }
          }

          // Fetch Combined Stats for current page routes
          if (routeIds.length > 0) {
            console.log("[fetchAllRouteData] Fetching route card stats for route IDs:", routeIds);
            const { data: statsData, error: statsError } = await supabase.rpc('get_route_card_stats', { route_ids: routeIds });
            if (statsError) console.error('[RoutesScreen] Error fetching route card stats via RPC:', statsError.message);
            else if (statsData) {
              console.log(`[fetchAllRouteData] Received ${statsData.length} stats items.`);
              setRouteStatsMap(prevMap => {
                 const newMap = new Map(prevMap);
                 (statsData as RouteCardStatsResult[]).forEach(item => {
                   newMap.set(item.route_id, {
                     textBetaCount: Number(item.text_beta_count),
                     videoBetaCount: Number(item.video_beta_count),
                     averageRating: item.average_rating,
                     ratingCount: Number(item.rating_count)
                   });
                 });
                 return newMap;
              });
            }
          }

          // Fetch Comment Counts for current page routes
          if (routeIds.length > 0) {
            console.log("[fetchAllRouteData] Fetching comment counts for route IDs:", routeIds);
            const { data: commentCountsData, error: commentCountsError } = await supabase.rpc('get_route_comment_counts', { route_ids: routeIds });
            if (commentCountsError) console.error('[RoutesScreen] Error fetching comment counts via RPC:', commentCountsError.message);
            else if (commentCountsData) {
               console.log(`[fetchAllRouteData] Received ${commentCountsData.length} comment count items.`);
               setCommentCountsMap(prevMap => {
                  const newMap = new Map(prevMap);
                  (commentCountsData as { route_id: string; count: number }[]).forEach(item => newMap.set(item.route_id, item.count));
                  return newMap;
               });
            }
          }

        } catch (err: any) {
          console.error("[RoutesScreen] Unexpected error fetching route data:", err);
          setError(err.message || "An unexpected error occurred.");
          if (!loadMore) {
            setBaseRoutes([]); setUserProgressMap(new Map()); setRouteStatsMap(new Map());
            setCommentCountsMap(new Map()); setGymLocations([]);
          }
          setHasMoreRoutes(false);
        } finally {
          setLoading(false);
          setLoadingMoreRoutes(false);
          console.log("[fetchAllRouteData] Fetch finished.");
        }
      // Dependencies needed *inside* the function
      }, [activeGymId, currentUser, selectedLocationFilter, selectedGradeFilter, selectedSortOption]);

      // --- Effect 1: Initial Load ---
      useEffect(() => {
        console.log("[Effect 1: Initial Load] Running on mount.");
        // Fetch initial data based on whether initialSearchTerm exists
        fetchAllRouteData(0, false, initialSearchTerm || ''); // Use initialSearchTerm if provided, otherwise empty string
        // Set initial mount flag to false *after* the first fetch is initiated
        // Use timeout to ensure it happens after the current render cycle completes
        const timer = setTimeout(() => {
            isInitialMount.current = false;
            console.log("[Effect 1: Initial Load] isInitialMount set to false.");
        }, 0);
        return () => clearTimeout(timer); // Cleanup timeout
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [initialSearchTerm]); // Rerun only if initialSearchTerm prop changes (should be rare)

      // --- Effect 2: Filter/Sort/Gym/User Changes ---
      useEffect(() => {
        // Skip the very first run because Effect 1 handles initial load
        if (isInitialMount.current) {
          console.log("[Effect 2: Filter/Sort Update] Skipping initial mount run.");
          return;
        }
        console.log("[Effect 2: Filter/Sort Update] Filters/Sort/Gym/User changed, fetching page 0.");
        // Fetch page 0 with the *current* search term when these dependencies change
        fetchAllRouteData(0, false, searchTerm);

      // Only depend on the actual filter/sort/user/gym states
      // REMOVED fetchAllRouteData and searchTerm from dependencies
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [activeGymId, currentUser, selectedLocationFilter, selectedGradeFilter, selectedSortOption]);

      // --- Effect 3: Debounced Search Term Changes ---
      useEffect(() => {
        // Skip the very first run if initialSearchTerm was handled by Effect 1
        if (isInitialMount.current && initialSearchTerm) {
            console.log("[Effect 3: Debounce] Skipping initial mount run (initialSearchTerm present).");
            return;
        }
        // Also skip if the component is still in its initial mount phase generally
        if (isInitialMount.current) {
            console.log("[Effect 3: Debounce] Skipping initial mount run.");
            return;
        }

        console.log(`[Effect 3: Debounce] Search term changed to: "${searchTerm}"`);
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

        debounceTimeoutRef.current = setTimeout(() => {
          console.log(`[Effect 3: Debounce] Debounce triggered for search: "${searchTerm}"`);
          fetchAllRouteData(0, false, searchTerm); // Fetch first page with the *current* search term
        }, 300); // 300ms debounce

        return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
      // Only depend on searchTerm and initialSearchTerm (for skip logic)
      // REMOVED fetchAllRouteData from dependencies
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [searchTerm, initialSearchTerm]);


      // --- Handle Show More ---
      const handleShowMore = () => {
          if (!loadingMoreRoutes && hasMoreRoutes) {
              console.log("[handleShowMore] Fetching next page:", currentPage + 1);
              fetchAllRouteData(currentPage + 1, true, searchTerm); // Fetch next page, indicate it's loading more
          }
      };

      // Get unique grades for the filter dropdown (based on currently loaded routes - could fetch all grades separately)
      const availableGrades = useMemo(() => {
        // This is now less accurate as it only shows grades from loaded pages.
        // Consider fetching all distinct grades for the gym separately if needed.
        const grades = new Set(baseRoutes.map(r => r.grade).filter(Boolean));
        return Array.from(grades).sort((a, b) => {
            const valA = getVGradeValue(a);
            const valB = getVGradeValue(b);
            if (valA !== -1 && valB !== -1) return valA - valB; // Sort V-grades numerically
            return a.localeCompare(b); // Fallback to string sort
        });
      }, [baseRoutes]);

      // Memoize augmented routes and apply client-side status filter/rating sort
      const augmentedAndFilteredRoutes = useMemo(() => {
        // 1. Augment routes with fetched auxiliary data
        const augmentedRoutes = baseRoutes.map(route => {
          const progress = userProgressMap.get(route.id);
          const stats = routeStatsMap.get(route.id) || { textBetaCount: 0, videoBetaCount: 0, averageRating: null, ratingCount: 0 };
          const commentCount = commentCountsMap.get(route.id) || 0;
          let status: 'sent' | 'attempted' | 'unseen' = 'unseen';
          if (progress?.sent_at) status = 'sent';
          else if (progress?.attempts && progress.attempts > 0) status = 'attempted';
          return {
            ...route,
            status,
            textBetaCount: stats.textBetaCount,
            videoBetaCount: stats.videoBetaCount,
            averageRating: stats.averageRating,
            ratingCount: stats.ratingCount,
            hasComments: commentCount > 0,
            hasNotes: !!progress?.notes && progress.notes.trim().length > 0,
            isOnWishlist: !!progress?.wishlist
          };
        });

        // 2. Apply client-side status filter
        let filteredRoutes = augmentedRoutes;
        if (selectedStatusFilter !== 'all') {
          filteredRoutes = filteredRoutes.filter(route => {
            if (selectedStatusFilter === 'wishlist') return route.isOnWishlist;
            return route.status === selectedStatusFilter;
          });
        }

        // 3. Apply client-side rating sort if selected
        if (selectedSortOption === 'rating_highest') {
          return [...filteredRoutes].sort((a, b) => {
            const ratingA = a.averageRating ?? -1;
            const ratingB = b.averageRating ?? -1;
            return ratingB - ratingA;
          });
        }

        // Otherwise, return routes as filtered by status (already sorted by DB for other options)
        return filteredRoutes;
      }, [
        baseRoutes, userProgressMap, routeStatsMap, commentCountsMap,
        selectedStatusFilter, selectedSortOption // Only client-side filters/sorts needed here
      ]);

      // --- Render Logic ---
      if (!activeGymId && !loading && baseRoutes.length === 0) { return <div className="p-4 pt-16 text-center text-brand-gray">Please select a gym first.</div>; }

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* Header Area */}
          <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
            <h1 className="text-xl font-bold text-center text-brand-green mb-4">{activeGymName} - Routes</h1>
            <div className="flex gap-2 items-center">
              {/* Search Bar */}
              <div className="relative flex-grow">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search routes by name, grade, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue bg-gray-100"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
              {/* Filter Button */}
              <button onClick={() => setShowFilters(!showFilters)} className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 text-brand-gray" aria-label="Filters"> <SlidersHorizontal size={20} /> </button>
            </div>
          </header>

          {/* Filter Options (Conditional) */}
          {showFilters && (
            <div className="bg-white p-4 border-b border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold mb-2 text-brand-gray">Filter & Sort</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {/* Location Filter */}
                <div className="relative">
                  <select value={selectedLocationFilter} onChange={(e) => setSelectedLocationFilter(e.target.value)} className="w-full appearance-none bg-gray-50 border border-gray-300 rounded p-2 pr-8 text-brand-gray hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-blue">
                    <option value="">All Locations</option>
                    {gymLocations.map(loc => ( <option key={loc.id} value={loc.id}>{loc.name}</option> ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {/* Grade Filter */}
                <div className="relative">
                  <select value={selectedGradeFilter} onChange={(e) => setSelectedGradeFilter(e.target.value)} className="w-full appearance-none bg-gray-50 border border-gray-300 rounded p-2 pr-8 text-brand-gray hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-blue">
                    <option value="">All Grades</option>
                    {/* TODO: Consider fetching all grades separately for a complete list */}
                    {availableGrades.map(grade => ( <option key={grade} value={grade}>{grade}</option> ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {/* Status Filter */}
                <div className="relative">
                  <select value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value as RouteStatusFilter)} className="w-full appearance-none bg-gray-50 border border-gray-300 rounded p-2 pr-8 text-brand-gray hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-blue">
                    <option value="all">All Statuses</option>
                    <option value="sent">Sent</option>
                    <option value="attempted">Attempted</option>
                    <option value="unseen">Unseen</option>
                    <option value="wishlist">Wishlist</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {/* Sort By */}
                <div className="relative">
                  <select value={selectedSortOption} onChange={(e) => setSelectedSortOption(e.target.value as SortOption)} className="w-full appearance-none bg-gray-50 border border-gray-300 rounded p-2 pr-8 text-brand-gray hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-blue">
                    <option value="date_newest">Sort: Newest</option>
                    <option value="grade_hardest">Sort: Grade (Hardest)</option>
                    <option value="grade_easiest">Sort: Grade (Easiest)</option>
                    <option value="rating_highest">Sort: Avg Rating</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Route List */}
          <main className="flex-grow p-4 space-y-3 overflow-y-auto pb-20">
            {loading && baseRoutes.length === 0 ? ( // Show initial loading spinner
              <div className="flex justify-center items-center pt-10"> <Loader2 className="animate-spin text-accent-blue mr-2" size={24} /> <p className="text-brand-gray">Loading routes...</p> </div>
            ) : error ? (
              <p className="text-center text-red-500 mt-8">{error}</p>
            ) : augmentedAndFilteredRoutes.length > 0 ? (
              <>
                {augmentedAndFilteredRoutes.map(route => ( <RouteCard key={route.id} route={route} onClick={() => onNavigate('routeDetail', { routeId: route.id })} /> ))}
                {/* Show More Button */}
                {hasMoreRoutes && (
                    <button
                        onClick={handleShowMore}
                        disabled={loadingMoreRoutes}
                        className="w-full mt-3 text-center text-sm text-accent-blue hover:underline font-medium py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {loadingMoreRoutes ? (
                            <> <Loader2 className="animate-spin mr-2" size={16} /> Loading... </>
                        ) : (
                            'Show More Routes'
                        )}
                    </button>
                )}
              </>
            ) : (
              // Display message based on whether filters are active or if the gym has no routes
              <p className="text-center text-gray-500 mt-8">
                {searchTerm || selectedLocationFilter || selectedGradeFilter || selectedStatusFilter !== 'all'
                  ? 'No routes found matching your criteria.'
                  : 'No active routes found for this gym yet.'}
              </p>
            )}
          </main>
        </div>
      );
    };

    export default RoutesScreen;
