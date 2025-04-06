import React, { useState, useEffect, useCallback, useRef } from 'react';
              import { Search, TrendingUp, Users, Compass, Loader2, UserPlus, UserCheck, AlertTriangle, Star } from 'lucide-react'; // Removed MapPin
              import { supabase, followUser, unfollowUser, checkFollowing } from '../../supabaseClient';
              import { UserMetadata, AppView, NavigationData, ActivityLogDetails, RouteData } from '../../types'; // Removed GymData as it's no longer used here
              import type { User } from '@supabase/supabase-js';

              // Helper to get avatar URL
              const getUserAvatarUrl = (profile: UserMetadata | null): string => {
                  const defaultName = profile?.display_name || 'User';
                  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=random&color=fff`;
                  return profile?.avatar_url || fallbackUrl;
              };

              // Helper to get Tailwind color class from grade_color string
              const getGradeColorClass = (colorName: string | undefined): string => {
                if (!colorName) return 'bg-gray-400';
                const colorMap: { [key: string]: string } = {
                  'accent-red': 'bg-accent-red', 'accent-blue': 'bg-accent-blue', 'accent-yellow': 'bg-accent-yellow',
                  'brand-green': 'bg-brand-green', 'accent-purple': 'bg-accent-purple', 'brand-gray': 'bg-brand-gray',
                  'brand-brown': 'bg-brand-brown',
                };
                return colorMap[colorName] || (colorMap[colorName.replace('_', '-')] || 'bg-gray-400');
              };

              // Interface for combined Route and Gym data for highlights
              interface HighlightRoute extends RouteData {
                gym_name?: string; // Add optional gym name
              }

              interface DiscoverScreenProps {
                currentUser: User | null;
                activeGymId: string | null; // Added activeGymId prop
                onNavigate: (view: AppView, data?: NavigationData) => void;
              }

              const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ currentUser, activeGymId, onNavigate }) => {
                // Removed gymSearchTerm state
                const [climberSearchTerm, setClimberSearchTerm] = useState('');
                const [searchResults, setSearchResults] = useState<UserMetadata[]>([]);
                const [isLoadingSearch, setIsLoadingSearch] = useState(false);
                const [searchError, setSearchError] = useState<string | null>(null);

                // State for Suggested Climbers
                const [suggestedClimbers, setSuggestedClimbers] = useState<UserMetadata[]>([]);
                const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
                const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

                // Combined state for follow status (used for both search and suggestions)
                const [followStatusMap, setFollowStatusMap] = useState<Map<string, boolean>>(new Map());
                const [isUpdatingFollowMap, setIsUpdatingFollowMap] = useState<Map<string, boolean>>(new Map());

                // State for Trending Routes
                const [trendingRoutes, setTrendingRoutes] = useState<HighlightRoute[]>([]);
                const [isLoadingTrending, setIsLoadingTrending] = useState(false);
                const [trendingError, setTrendingError] = useState<string | null>(null);

                const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

                // --- Fetch Trending Routes (Most Recently Added) ---
                const fetchTrendingRoutes = useCallback(async () => {
                  setIsLoadingTrending(true);
                  setTrendingError(null);
                  try {
                    const { data, error } = await supabase
                      .from('routes')
                      .select(`*, gym:gyms ( name )`)
                      .is('removed_at', null)
                      .order('created_at', { ascending: false })
                      .limit(3);
                    if (error) throw new Error(`Failed to fetch trending routes: ${error.message}`);
                    if (data) {
                      const mappedRoutes = data.map(route => ({ ...route, gym_name: (route.gym as any)?.name || 'Unknown Gym' }));
                      setTrendingRoutes(mappedRoutes as HighlightRoute[]);
                    } else { setTrendingRoutes([]); }
                  } catch (err: any) {
                    console.error("Error fetching trending routes:", err);
                    setTrendingError(err.message || "An unexpected error occurred.");
                    setTrendingRoutes([]);
                  } finally { setIsLoadingTrending(false); }
                }, []);

                useEffect(() => { fetchTrendingRoutes(); }, [fetchTrendingRoutes]);

                // --- Fetch Follow Statuses (for search results OR suggestions) ---
                const fetchFollowStatuses = useCallback(async (userIds: string[]) => {
                  if (!currentUser || userIds.length === 0) { setFollowStatusMap(new Map()); return; }
                  try {
                    const { data, error } = await supabase
                      .from('user_follows').select('following_id')
                      .eq('follower_id', currentUser.id).in('following_id', userIds);
                    if (error) { console.error("Error fetching follow statuses:", error); setFollowStatusMap(new Map()); return; }
                    const newFollowStatusMap = new Map<string, boolean>();
                    userIds.forEach(id => { const isFollowing = data?.some(follow => follow.following_id === id) ?? false; newFollowStatusMap.set(id, isFollowing); });
                    // Merge with existing statuses to avoid losing state when switching between search/suggestions
                    setFollowStatusMap(prevMap => {
                        const mergedMap = new Map(prevMap);
                        newFollowStatusMap.forEach((status, id) => mergedMap.set(id, status));
                        return mergedMap;
                    });
                  } catch (err) { console.error("Unexpected error fetching follow statuses:", err); setFollowStatusMap(new Map()); }
                }, [currentUser]);

                // --- Fetch Suggested Climbers ---
                const fetchSuggestedClimbers = useCallback(async () => {
                  if (!currentUser || !activeGymId) {
                    setSuggestedClimbers([]); setIsLoadingSuggestions(false); setSuggestionsError(null); return;
                  }
                  setIsLoadingSuggestions(true); setSuggestionsError(null);
                  try {
                    const { data, error } = await supabase.rpc('get_suggested_climbers', {
                      user_id_in: currentUser.id,
                      gym_id_in: activeGymId,
                      limit_in: 5 // Fetch top 5 suggestions
                    });
                    if (error) throw new Error(`Failed to fetch suggestions: ${error.message}`);
                    const suggestions = (data || []) as UserMetadata[];
                    setSuggestedClimbers(suggestions);
                    if (suggestions.length > 0) { fetchFollowStatuses(suggestions.map(p => p.user_id)); }
                  } catch (err: any) {
                    console.error("Error fetching suggested climbers:", err);
                    setSuggestionsError(err.message || "An unexpected error occurred.");
                    setSuggestedClimbers([]);
                  } finally { setIsLoadingSuggestions(false); }
                }, [currentUser, activeGymId, fetchFollowStatuses]);

                // Fetch suggestions on mount or when gym changes, only if search is empty
                useEffect(() => {
                  if (!climberSearchTerm.trim()) {
                    fetchSuggestedClimbers();
                  } else {
                    // Clear suggestions if user starts searching
                    setSuggestedClimbers([]);
                    setIsLoadingSuggestions(false);
                    setSuggestionsError(null);
                  }
                }, [fetchSuggestedClimbers, activeGymId, climberSearchTerm]); // Add activeGymId and climberSearchTerm

                // --- Search Climbers ---
                const searchClimbers = useCallback(async (term: string) => {
                  if (!term.trim() || !currentUser) { setSearchResults([]); setIsLoadingSearch(false); setSearchError(null); return; }
                  setIsLoadingSearch(true); setSearchError(null);
                  // Clear suggestions when searching
                  setSuggestedClimbers([]); setIsLoadingSuggestions(false); setSuggestionsError(null);
                  try {
                    const { data, error } = await supabase
                      .from('profiles').select('*').ilike('display_name', `%${term.trim()}%`)
                      .neq('user_id', currentUser.id).limit(10);
                    if (error) throw new Error(`Failed to search climbers: ${error.message}`);
                    const results = data || [];
                    setSearchResults(results);
                    if (results.length > 0) { fetchFollowStatuses(results.map(p => p.user_id)); }
                  } catch (err: any) {
                    console.error("Error searching climbers:", err);
                    setSearchError(err.message || "An unexpected error occurred.");
                    setSearchResults([]);
                  } finally { setIsLoadingSearch(false); }
                }, [currentUser, fetchFollowStatuses]);

                // --- Debounced Search Effect ---
                useEffect(() => {
                  if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
                  if (climberSearchTerm.trim()) {
                    debounceTimeoutRef.current = setTimeout(() => searchClimbers(climberSearchTerm), 300);
                  } else {
                    // Clear search results and fetch suggestions when search is cleared
                    setSearchResults([]); setIsLoadingSearch(false); setSearchError(null);
                    fetchSuggestedClimbers(); // Refetch suggestions
                  }
                  return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
                }, [climberSearchTerm, searchClimbers, fetchSuggestedClimbers]); // Add fetchSuggestedClimbers

                // --- Handle Follow/Unfollow Toggle ---
                const handleFollowToggle = async (targetUserId: string, targetUserName: string) => {
                  if (!currentUser || isUpdatingFollowMap.get(targetUserId)) return;
                  setIsUpdatingFollowMap(prev => new Map(prev).set(targetUserId, true));
                  const currentlyFollowing = followStatusMap.get(targetUserId) || false;
                  try {
                    if (currentlyFollowing) { await unfollowUser(currentUser.id, targetUserId); setFollowStatusMap(prev => new Map(prev).set(targetUserId, false)); }
                    else {
                      await followUser(currentUser.id, targetUserId); setFollowStatusMap(prev => new Map(prev).set(targetUserId, true));
                      const activityDetails: ActivityLogDetails = { followed_user_id: targetUserId, followed_user_name: targetUserName };
                      const { error: logError } = await supabase.from('activity_log').insert({ user_id: currentUser.id, gym_id: activeGymId, activity_type: 'follow_user', details: activityDetails });
                      if (logError) console.error('Error logging follow activity:', logError);
                    }
                  } catch (error: any) {
                    console.error("Error updating follow status:", error);
                    const check = await checkFollowing(currentUser.id, targetUserId); setFollowStatusMap(prev => new Map(prev).set(targetUserId, check));
                  } finally { setIsUpdatingFollowMap(prev => new Map(prev).set(targetUserId, false)); }
                };

                // --- Render Climber Item (used for both search and suggestions) ---
                const renderClimberItem = (profile: UserMetadata) => {
                    const isFollowing = followStatusMap.get(profile.user_id) || false;
                    const isUpdating = isUpdatingFollowMap.get(profile.user_id) || false;
                    return (
                      <div key={profile.user_id} className="flex items-center justify-between gap-3 p-2 border-b last:border-b-0">
                        <button
                          onClick={() => onNavigate('publicProfile', { profileUserId: profile.user_id })}
                          className="flex items-center gap-3 flex-grow hover:opacity-80"
                        >
                          <img src={getUserAvatarUrl(profile)} alt={profile.display_name} className="w-10 h-10 rounded-full object-cover bg-gray-300" />
                          <div>
                            <p className="font-medium text-brand-gray text-sm">{profile.display_name}</p>
                            {/* Optional: Add home gym info later */}
                          </div>
                        </button>
                        <button
                          onClick={() => handleFollowToggle(profile.user_id, profile.display_name)}
                          disabled={isUpdating || !currentUser}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 flex items-center gap-1 disabled:opacity-60 ${
                            isFollowing
                              ? 'bg-gray-200 text-brand-gray hover:bg-gray-300'
                              : 'bg-accent-blue text-white hover:bg-opacity-90'
                          }`}
                        >
                          {isUpdating ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : isFollowing ? (
                            <><UserCheck size={14} /> Following</>
                          ) : (
                            <><UserPlus size={14} /> Follow</>
                          )}
                        </button>
                      </div>
                    );
                };

                return (
                  <div className="min-h-screen bg-gray-100 pb-16"> {/* Added padding-bottom */}
                    {/* Header */}
                    <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
                      <h1 className="text-xl font-bold text-center text-brand-green flex items-center justify-center gap-2">
                         <Compass size={24} className="text-accent-blue"/> Discover
                      </h1>
                    </header>

                    {/* Main Content */}
                    <main className="p-4 space-y-6">
                      {/* REMOVED: Gym Search Section */}
                      {/* <section> ... </section> */}

                      {/* Community Highlights Section */}
                      <section>
                        <h2 className="text-lg font-semibold text-brand-gray mb-3 flex items-center gap-2">
                           <TrendingUp size={20} /> Community Highlights
                        </h2>
                        {isLoadingTrending ? (
                          <div className="flex justify-center items-center p-6 bg-white rounded-lg shadow">
                            <Loader2 className="animate-spin text-accent-blue mr-2" size={24} />
                            <p className="text-brand-gray">Loading highlights...</p>
                          </div>
                        ) : trendingError ? (
                          <p className="text-center text-red-500 p-6 bg-white rounded-lg shadow">{trendingError}</p>
                        ) : trendingRoutes.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {trendingRoutes.map(route => (
                               <div
                                  key={route.id}
                                  onClick={() => onNavigate('routeDetail', { routeId: route.id })}
                                  className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                                >
                                  {route.image_url ? (
                                    <img src={route.image_url} alt={route.name} className="w-full h-32 object-cover" />
                                  ) : (
                                    <div className={`w-full h-32 ${getGradeColorClass(route.grade_color)} flex items-center justify-center text-white font-bold text-2xl`}>
                                      {route.grade}
                                    </div>
                                  )}
                                  <div className="p-3">
                                     <p className="font-semibold text-brand-gray truncate">{route.name} ({route.grade})</p>
                                     <p className="text-xs text-gray-500 truncate">{route.gym_name}</p>
                                  </div>
                               </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 p-6 bg-white rounded-lg shadow">No trending routes found right now.</p>
                        )}
                      </section>

                      {/* Connect Section */}
                      <section>
                        <h2 className="text-lg font-semibold text-brand-gray mb-3 flex items-center gap-2">
                           <Users size={20} /> Connect with Climbers
                        </h2>
                        {/* Climber Search Input */}
                        <div className="relative mb-4">
                          <input
                            type="text"
                            placeholder="Search climbers by display name..."
                            value={climberSearchTerm}
                            onChange={(e) => setClimberSearchTerm(e.target.value)}
                            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue bg-white"
                            disabled={!currentUser}
                          />
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        </div>

                        {/* Suggestions/Search Results Area */}
                        <div className="bg-white p-4 rounded-lg shadow space-y-3 min-h-[150px]">
                          {/* Loading States */}
                          {isLoadingSearch && (
                            <div className="flex justify-center items-center py-4">
                              <Loader2 className="animate-spin text-accent-blue" size={24} />
                              <span className="ml-2 text-sm text-brand-gray">Searching...</span>
                            </div>
                          )}
                          {isLoadingSuggestions && !climberSearchTerm.trim() && (
                            <div className="flex justify-center items-center py-4">
                              <Loader2 className="animate-spin text-accent-blue" size={24} />
                              <span className="ml-2 text-sm text-brand-gray">Loading suggestions...</span>
                            </div>
                          )}

                          {/* Error States */}
                          {searchError && (
                            <p className="text-center text-red-500 text-sm py-4 flex items-center justify-center gap-2">
                              <AlertTriangle size={18} /> {searchError}
                            </p>
                          )}
                          {suggestionsError && !climberSearchTerm.trim() && !isLoadingSuggestions && (
                             <p className="text-center text-red-500 text-sm py-4 flex items-center justify-center gap-2">
                               <AlertTriangle size={18} /> {suggestionsError}
                             </p>
                          )}

                          {/* Display Search Results */}
                          {!isLoadingSearch && !searchError && climberSearchTerm.trim() && searchResults.length > 0 && (
                            searchResults.map(renderClimberItem)
                          )}
                          {!isLoadingSearch && !searchError && climberSearchTerm.trim() && searchResults.length === 0 && (
                            <p className="text-center text-gray-500 text-sm py-4">No climbers found matching "{climberSearchTerm}".</p>
                          )}

                          {/* Display Suggestions */}
                          {!climberSearchTerm.trim() && !isLoadingSuggestions && !suggestionsError && suggestedClimbers.length > 0 && (
                            <>
                              <p className="text-xs font-semibold text-brand-gray uppercase tracking-wide flex items-center gap-1.5 mb-1">
                                <Star size={14} className="text-accent-yellow" /> Suggestions for You
                              </p>
                              {suggestedClimbers.map(renderClimberItem)}
                            </>
                          )}
                          {!climberSearchTerm.trim() && !isLoadingSuggestions && !suggestionsError && suggestedClimbers.length === 0 && (
                            <p className="text-center text-gray-500 text-sm py-4">No suggestions found for your current gym right now.</p>
                          )}

                          {/* Fallback/Login Prompt */}
                           {!currentUser && (
                              <p className="text-center text-gray-500 text-sm py-4">Log in to connect with climbers.</p>
                           )}
                        </div>
                      </section>
                    </main>
                  </div>
                );
              };

              export default DiscoverScreen;
