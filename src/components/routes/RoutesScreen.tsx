import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
        import { Search, SlidersHorizontal, ChevronDown, Loader2, MapPin } from 'lucide-react';
        import RouteCard from './RouteCard';
        import { RouteData, AppView, UserRouteProgressData, LocationData } from '../../types';
        import { supabase } from '../../supabaseClient';
        import type { User } from '@supabase/supabase-js';

        interface RoutesScreenProps {
          activeGymId: string | null;
          activeGymName: string;
          onNavigate: (view: AppView, data?: string | { routeId?: string; searchTerm?: string }) => void;
          initialSearchTerm?: string;
          currentUser: User | null;
        }

        type CountResult = { route_id: string; count: number };
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


        const RoutesScreen: React.FC<RoutesScreenProps> = ({
          activeGymId,
          activeGymName,
          onNavigate,
          initialSearchTerm,
          currentUser,
        }) => {
          const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
          const [showFilters, setShowFilters] = useState(false);
          const [baseRoutes, setBaseRoutes] = useState<RouteData[]>([]);
          const [userProgressMap, setUserProgressMap] = useState<Map<string, UserRouteProgressData>>(new Map());
          const [betaCountsMap, setBetaCountsMap] = useState<Map<string, number>>(new Map());
          const [commentCountsMap, setCommentCountsMap] = useState<Map<string, number>>(new Map());
          const [gymLocations, setGymLocations] = useState<LocationData[]>([]);
          const [loading, setLoading] = useState(false);
          const [error, setError] = useState<string | null>(null);

          // Filter States
          const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('');
          const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('');
          const [selectedStatusFilter, setSelectedStatusFilter] = useState<RouteStatusFilter>('all');
          const [selectedSortOption, setSelectedSortOption] = useState<SortOption>('date_newest');

          const searchInputRef = useRef<HTMLInputElement>(null);
          const [didFocusOnMount, setDidFocusOnMount] = useState(false);

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

          useEffect(() => {
            const fetchAllRouteData = async () => {
              if (!activeGymId) {
                setBaseRoutes([]); setUserProgressMap(new Map()); setBetaCountsMap(new Map());
                setCommentCountsMap(new Map()); setGymLocations([]); setError(null); setLoading(false);
                return;
              }
              setLoading(true); setError(null); setBaseRoutes([]); setUserProgressMap(new Map());
              setBetaCountsMap(new Map()); setCommentCountsMap(new Map()); setGymLocations([]);

              try {
                const { data: locationsData, error: locationsError } = await supabase
                  .from('locations').select('*').eq('gym_id', activeGymId).order('name', { ascending: true });
                if (locationsError) console.error('[RoutesScreen] Error fetching locations:', locationsError.message);
                else setGymLocations(locationsData || []);

                // Fetch only routes that are NOT removed
                const { data: routesData, error: routesError } = await supabase
                  .from('routes')
                  .select(`*, location_name:locations ( name )`)
                  .eq('gym_id', activeGymId)
                  .is('removed_at', null) // <-- Filter out removed routes
                  .order('date_set', { ascending: false });

                if (routesError) throw new Error(`Failed to load routes: ${routesError.message}`);
                if (!routesData || routesData.length === 0) { setBaseRoutes([]); setLoading(false); return; }

                const mappedRoutes = routesData.map(r => ({ ...r, location_name: (r.location_name as any)?.name || null }));
                setBaseRoutes(mappedRoutes as RouteData[]);
                const routeIds = mappedRoutes.map(r => r.id);

                let progressMap = new Map<string, UserRouteProgressData>();
                if (currentUser && routeIds.length > 0) {
                  const { data: progressData, error: progressError } = await supabase
                    .from('user_route_progress').select('*').eq('user_id', currentUser.id).in('route_id', routeIds);
                  if (progressError) console.error('[RoutesScreen] Error fetching user progress:', progressError.message);
                  else if (progressData) progressData.forEach(p => progressMap.set(p.route_id, p));
                  setUserProgressMap(progressMap);
                }

                let betaMap = new Map<string, number>();
                if (routeIds.length > 0) {
                  const { data: betaCountsData, error: betaCountsError } = await supabase.rpc('get_route_beta_counts', { route_ids: routeIds });
                  if (betaCountsError) console.error('[RoutesScreen] Error fetching beta counts via RPC:', betaCountsError.message);
                  else if (betaCountsData) (betaCountsData as CountResult[]).forEach(item => betaMap.set(item.route_id, item.count));
                  setBetaCountsMap(betaMap);
                }

                let commentMap = new Map<string, number>();
                if (routeIds.length > 0) {
                  const { data: commentCountsData, error: commentCountsError } = await supabase.rpc('get_route_comment_counts', { route_ids: routeIds });
                  if (commentCountsError) console.error('[RoutesScreen] Error fetching comment counts via RPC:', commentCountsError.message);
                  else if (commentCountsData) (commentCountsData as CountResult[]).forEach(item => commentMap.set(item.route_id, item.count));
                  setCommentCountsMap(commentMap);
                }
              } catch (err: any) {
                console.error("[RoutesScreen] Unexpected error fetching route data:", err);
                setError(err.message || "An unexpected error occurred.");
                setBaseRoutes([]); setUserProgressMap(new Map()); setBetaCountsMap(new Map());
                setCommentCountsMap(new Map()); setGymLocations([]);
              } finally { setLoading(false); }
            };
            fetchAllRouteData();
          }, [activeGymId, currentUser]);

          // Get unique grades for the filter dropdown
          const availableGrades = useMemo(() => {
            const grades = new Set(baseRoutes.map(r => r.grade).filter(Boolean));
            return Array.from(grades).sort((a, b) => {
                const valA = getVGradeValue(a);
                const valB = getVGradeValue(b);
                if (valA !== -1 && valB !== -1) return valA - valB; // Sort V-grades numerically
                return a.localeCompare(b); // Fallback to string sort
            });
          }, [baseRoutes]);

          // Memoize augmented, filtered, and sorted routes
          const augmentedFilteredAndSortedRoutes = useMemo(() => {
            // 1. Augment routes with progress, beta, comments, etc.
            // No need to filter removed_at here as it's done during fetch
            const augmentedRoutes = baseRoutes.map(route => {
              const progress = userProgressMap.get(route.id);
              const betaCount = betaCountsMap.get(route.id) || 0;
              const commentCount = commentCountsMap.get(route.id) || 0;
              let status: 'sent' | 'attempted' | 'unseen' = 'unseen';
              if (progress?.sent_at) status = 'sent';
              else if (progress?.attempts && progress.attempts > 0) status = 'attempted';
              return {
                ...route,
                status,
                hasBeta: betaCount > 0,
                hasComments: commentCount > 0,
                hasNotes: !!progress?.notes && progress.notes.trim().length > 0,
                rating: progress?.rating,
                isOnWishlist: !!progress?.wishlist
              };
            });

            // 2. Filter routes
            let filteredRoutes = augmentedRoutes;
            // Search Term Filter
            if (searchTerm) {
              const lowerSearchTerm = searchTerm.toLowerCase();
              filteredRoutes = filteredRoutes.filter(route =>
                (route.name?.toLowerCase() || '').includes(lowerSearchTerm) ||
                (route.grade?.toLowerCase() || '').includes(lowerSearchTerm) ||
                (route.location_name?.toLowerCase() || '').includes(lowerSearchTerm)
              );
            }
            // Location Filter
            if (selectedLocationFilter) {
              filteredRoutes = filteredRoutes.filter(route => route.location_id === selectedLocationFilter);
            }
            // Grade Filter
            if (selectedGradeFilter) {
              filteredRoutes = filteredRoutes.filter(route => route.grade === selectedGradeFilter);
            }
            // Status Filter
            if (selectedStatusFilter !== 'all') {
              filteredRoutes = filteredRoutes.filter(route => {
                if (selectedStatusFilter === 'wishlist') return route.isOnWishlist;
                return route.status === selectedStatusFilter;
              });
            }

            // 3. Sort routes
            const sortedRoutes = [...filteredRoutes].sort((a, b) => {
              switch (selectedSortOption) {
                case 'grade_hardest':
                  return getVGradeValue(b.grade) - getVGradeValue(a.grade);
                case 'grade_easiest':
                  return getVGradeValue(a.grade) - getVGradeValue(b.grade);
                case 'rating_highest':
                  // Sort by rating (desc), put nulls last
                  const ratingA = a.rating ?? -1;
                  const ratingB = b.rating ?? -1;
                  return ratingB - ratingA;
                case 'date_newest':
                default:
                  // Already fetched newest first, but explicit sort is safer
                  return new Date(b.date_set).getTime() - new Date(a.date_set).getTime();
              }
            });

            return sortedRoutes;
          }, [
            baseRoutes, userProgressMap, betaCountsMap, commentCountsMap,
            searchTerm, selectedLocationFilter, selectedGradeFilter, selectedStatusFilter, selectedSortOption
          ]);

          // --- Render Logic ---
          if (!activeGymId && !loading) { return <div className="p-4 pt-16 text-center text-brand-gray">Please select a gym first.</div>; }

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
                        <option value="rating_highest">Sort: Your Rating</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* Route List */}
              <main className="flex-grow p-4 space-y-3 overflow-y-auto pb-20">
                {loading ? ( <div className="flex justify-center items-center pt-10"> <Loader2 className="animate-spin text-accent-blue mr-2" size={24} /> <p className="text-brand-gray">Loading routes...</p> </div>
                ) : error ? ( <p className="text-center text-red-500 mt-8">{error}</p>
                ) : augmentedFilteredAndSortedRoutes.length > 0 ? ( augmentedFilteredAndSortedRoutes.map(route => ( <RouteCard key={route.id} route={route} onClick={() => onNavigate('routeDetail', { routeId: route.id })} /> ))
                ) : ( <p className="text-center text-gray-500 mt-8"> {baseRoutes.length === 0 ? 'No active routes found for this gym yet.' : 'No routes found matching your criteria.'} </p> )}
              </main>
            </div>
          );
        };

        export default RoutesScreen;
